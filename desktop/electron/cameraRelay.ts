// desktop/electron/cameraRelay.ts
//
// 手机相机中继（第一期：实时影像）。
//
// 原理：手机浏览器 getUserMedia 拿相机 → WebRTC 推流到桌面端（同一局域网直连）。
// 本模块负责两件事：
//   1) HTTPS 静态服务：给手机提供一个极简连接页（getUserMedia 必须在安全上下文，
//      局域网 http 不行，所以用自签证书的 https；手机浏览器提示不安全时点
//      「高级 → 继续访问」「显示详细信息 → 访问此网站」即可）。
//   2) WebSocket 信令：把手机发来的 WebRTC offer/ICE 原样转给渲染层相机页面，
//      把渲染层的 answer/ICE 转回手机。媒体流本身不走这里（P2P 直连，延迟低）。
//
// 注意：电脑的局域网 IP 可能在 app 启动之后才拿到（刚开机 Wi-Fi 未连、换网络）。
// 每次页面取 relay-info 都会重新检测；首选 IP 变了会按新 IP 重签证书、重绑端口，
// 并通知页面刷新二维码，避免把 https://127.0.0.1:9443 这种手机永远连不上的
// 地址生成到二维码里。页面还会列出全部候选 IP，多网卡时可手动切换。

import { app, ipcMain, shell, type WebContents } from 'electron'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import forge from 'node-forge'
import { WebSocketServer, type WebSocket } from 'ws'

interface RelayInfo {
  url: string
  port: number
  ip: string
  /** 电脑上全部可用的局域网 IPv4（页面可切换） */
  ips: string[]
  /** 有真实局域网地址；false 表示只有 127.0.0.1，二维码不可用 */
  valid: boolean
}

let server: https.Server | null = null
let wss: WebSocketServer | null = null
/** 当前推流的手机连接（一期只支持一台，后来者顶掉前者） */
let phoneSocket: WebSocket | null = null
/** 已挂载的相机页面渲染进程 */
let attached: WebContents | null = null
let relayInfo: RelayInfo | null = null
let boundPort = 0
let cachedIp = ''
let phoneHtml = ''
let refreshing: Promise<void> | null = null

/** 电脑上全部非回环 IPv4；排除 169.254.*（APIPA，没拿到 DHCP 的无效地址） */
function lanIps(): string[] {
  const nets = os.networkInterfaces()
  const found: string[] = []
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family !== 'IPv4' || net.internal) continue
      const ip = net.address
      if (ip.startsWith('127.') || ip.startsWith('169.254.')) continue
      if (!found.includes(ip)) found.push(ip)
    }
  }
  // 常见家用/校园网段优先，其他（虚拟网卡、公网直通）排后面
  const rank = (ip: string) =>
    /^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 1 : 2
  return found.sort((a, b) => rank(a) - rank(b))
}

/**
 * 自签证书，按「当前局域网 IP」缓存到 userData：IP 变了（换 Wi-Fi）就重新生成，
 * 保证 SAN 里始终有当前地址，手机浏览器「继续访问」后 getUserMedia 可用。
 */
function ensureCert(ip: string): { key: string; cert: string } {
  const dir = path.join(app.getPath('userData'), 'camera-relay')
  const keyFile = path.join(dir, 'relay.key.pem')
  const certFile = path.join(dir, 'relay.cert.pem')
  const ipFile = path.join(dir, 'relay.ip')
  try {
    if (fs.existsSync(certFile) && fs.existsSync(keyFile) && fs.existsSync(ipFile) && fs.readFileSync(ipFile, 'utf-8').trim() === ip) {
      return { key: fs.readFileSync(keyFile, 'utf-8'), cert: fs.readFileSync(certFile, 'utf-8') }
    }
  } catch {
    /* 缓存读不了就重新生成 */
  }

  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date(Date.now() - 60 * 1000)
  cert.validity.notAfter = new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000)
  const attrs = [{ name: 'commonName', value: 'OpenEDU Camera Relay' }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, keyEncipherment: true },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip },
      ],
    },
  ])
  cert.sign(keys.privateKey, forge.sha256.create())

  fs.mkdirSync(dir, { recursive: true })
  const key = forge.pki.privateKeyToPem(keys.privateKey)
  const pem = forge.pki.certificateToPem(cert)
  fs.writeFileSync(keyFile, key)
  fs.writeFileSync(certFile, pem)
  fs.writeFileSync(ipFile, ip)
  return { key, cert: pem }
}

/** 手机连接页：拿相机 → 连 ws → 发 offer。所有文案中英双语写死，页面不依赖 i18n */
function phonePageHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title>OpenEDU 相机 / Camera</title>
<style>
  body { margin:0; font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;
         background:#0e1526; color:#eaf1ff; text-align:center; }
  #video { width:100vw; max-height:62vh; object-fit:contain; background:#000; display:block; }
  #tip { padding:14px 18px; font-size:15px; line-height:1.6; }
  #state { padding:6px 14px; border-radius:18px; display:inline-block; margin-top:4px;
           background:#223a5e; font-size:14px; }
  #state.ok { background:#1a6b3c; }
  #state.err { background:#8a2b2b; }
  small { color:#9fb3d9; }
</style>
</head>
<body>
<video id="video" autoplay playsinline muted></video>
<div id="tip">
  <div>📱 OpenEDU 手机相机</div>
  <div id="state">允许相机权限… / Allow camera access…</div>
  <small>允许权限后，画面会自动出现在电脑上</small><br>
  <small>Allow camera access and the live video will show up on your computer</small>
</div>
<script>
(function () {
  var video = document.getElementById('video')
  var state = document.getElementById('state')
  var pc = null, ws = null, stream = null

  function setState(text, cls) { state.textContent = text; state.className = cls || '' }

  function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)) }

  function start() {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    }).then(function (s) {
      stream = s
      video.srcObject = s
      connect()
    }).catch(function (err) {
      if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
        setState('相机权限被拒绝 / Permission denied', 'err')
      } else {
        setState('无法打开相机 / Cannot open camera', 'err')
      }
    })
  }

  function connect() {
    setState('正在连接电脑… / Connecting…')
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws')

    ws.onopen = function () {
      pc = new RTCPeerConnection()
      stream.getTracks().forEach(function (t) { pc.addTrack(t, stream) })
      pc.onicecandidate = function (e) {
        if (e.candidate) send({ type: 'candidate', candidate: e.candidate.toJSON() })
      }
      // 只有真正 P2P 连通才算成功；黑屏排查时看这里的状态
      pc.onconnectionstatechange = function () {
        if (!pc) return
        var s = pc.connectionState
        if (s === 'connected') setState('影像已传到电脑 / Streaming', 'ok')
        else if (s === 'failed' || s === 'disconnected' || s === 'closed') setState('影像连接中断 / Connection ' + s, 'err')
        else setState('正在建立影像连接… / ' + s, '')
      }
      pc.createOffer().then(function (offer) {
        return pc.setLocalDescription(offer)
      }).then(function () {
        send({ type: 'offer', sdp: pc.localDescription.toJSON() })
        setState('已发连接请求，等待电脑… / Waiting for computer…', '')
      }).catch(function () { setState('建立连接失败 / Failed to negotiate', 'err') })
    }

    ws.onmessage = function (ev) {
      try { var msg = JSON.parse(ev.data) } catch (e) { return }
      if (msg.type === 'answer' && pc) {
        setState('电脑已回应，正在连通… / Answer received…', '')
        pc.setRemoteDescription(msg.sdp).catch(function () { setState('电脑回应无效 / Bad answer', 'err') })
      } else if (msg.type === 'candidate' && pc) {
        pc.addIceCandidate(msg.candidate).catch(function () {})
      }
    }

    ws.onclose = function () {
      if (pc) { try { pc.close() } catch (e) {} pc = null }
      setState('连接断开，请刷新本页重试 / Disconnected, refresh this page', 'err')
    }
  }

  window.addEventListener('beforeunload', function () {
    if (stream) stream.getTracks().forEach(function (t) { t.stop() })
    if (ws) ws.close()
  })

  start()
})()
</script>
</body>
</html>`
}

/** 转发给相机页面（渲染层） */
function toRenderer(channel: string, payload: unknown) {
  if (attached && !attached.isDestroyed()) {
    attached.send(channel, payload)
  }
}

function makeInfo(ip: string, port: number): RelayInfo {
  const ips = lanIps()
  return {
    url: `https://${ip}:${port}/`,
    port,
    ip,
    ips,
    valid: ips.length > 0,
  }
}

/** 在指定端口按指定 IP 重签证书并启动 https 服务 */
async function bind(port: number, ip: string): Promise<boolean> {
  const { key, cert } = ensureCert(ip)
  const html = phoneHtml
  const s = https.createServer({ key, cert }, (req, res) => {
    const url = (req.url || '/').split('?')[0]
    if (url === '/' || url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(html)
      return
    }
    if (url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('ok')
      return
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('not found')
  })

  s.on('upgrade', (req, socket, head) => {
    const url = (req.url || '/').split('?')[0]
    if (url === '/ws' && wss) wss.handleUpgrade(req, socket, head, (ws) => wss!.emit('connection', ws, req))
    else socket.destroy()
  })

  const ok = await new Promise<boolean>((resolve) => {
    s.once('error', () => resolve(false))
    s.listen(port, '0.0.0.0', () => {
      s.removeAllListeners('error')
      resolve(true)
    })
  })
  if (!ok) {
    try { s.close() } catch { /* noop */ }
    return false
  }
  server = s
  return true
}

/** 9443 起连续尝试 10 个端口 */
export async function startCameraRelay(): Promise<void> {
  if (server) return
  phoneHtml = phonePageHtml()

  wss = new WebSocketServer({ noServer: true })
  wss.on('connection', (ws: WebSocket) => {
    // 一期只支持一台手机：新连接顶掉旧连接
    if (phoneSocket && phoneSocket !== ws) {
      try { phoneSocket.close(4000, 'replaced') } catch { /* noop */ }
    }
    phoneSocket = ws
    toRenderer('camera:phone-opened', null)

    ws.on('message', (raw) => {
      let msg: { type?: string; sdp?: unknown; candidate?: unknown }
      try {
        msg = JSON.parse(String(raw))
      } catch {
        return
      }
      if (msg.type === 'offer') toRenderer('camera:offer', msg.sdp)
      else if (msg.type === 'candidate') toRenderer('camera:ice', msg.candidate)
    })
    ws.on('close', () => {
      if (phoneSocket === ws) {
        phoneSocket = null
        toRenderer('camera:phone-closed', null)
      }
    })
  })

  cachedIp = lanIps()[0] || '127.0.0.1'
  for (let port = 9443; port <= 9452; port += 1) {
    if (await bind(port, cachedIp)) {
      boundPort = port
      relayInfo = makeInfo(cachedIp, port)
      return
    }
  }
  relayInfo = null
  server = null
  wss = null
  throw new Error('camera-relay: no free port in 9443..9452')
}

/**
 * 页面每次取 info 都会走这里：Wi-Fi 后连上、换网段、休眠唤醒后 IP 变化，
 * 都按新 IP 重签证书并重绑同一端口，再通知页面刷新二维码。
 */
async function refreshRelayIp(): Promise<void> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const ips = lanIps()
    const ip = ips[0] || '127.0.0.1'
    if (!relayInfo || !server) return
    relayInfo = { ...relayInfo, ips, valid: ips.length > 0 }
    if (ip === cachedIp) return

    try {
      server.closeAllConnections?.()
      await new Promise<void>((resolve) => server?.close(() => resolve()))
    } catch { /* noop */ }
    server = null

    if (!(await bind(boundPort, ip))) return
    cachedIp = ip
    relayInfo = makeInfo(ip, boundPort)
    toRenderer('camera:relay-changed', relayInfo)
  })()
  try {
    await refreshing
  } finally {
    refreshing = null
  }
}

export function stopCameraRelay(): void {
  try { server?.closeAllConnections?.() } catch { /* noop */ }
  try { server?.close() } catch { /* noop */ }
  try { phoneSocket?.close() } catch { /* noop */ }
  try { wss?.close() } catch { /* noop */ }
  server = null
  wss = null
  phoneSocket = null
  relayInfo = null
}

/**
 * 拍照/录像存档目录：优先 img-library/openEDU/tmp（和课程素材统一管理），
 * 目录建不了或不可写时回退 userData/captures。
 */
const CAPTURES_DIR = 'C:\\Projects\\img-library\\openEDU\\tmp'

function ensureCapturesDir(): string {
  try {
    fs.mkdirSync(CAPTURES_DIR, { recursive: true })
    fs.accessSync(CAPTURES_DIR, fs.constants.W_OK)
    return CAPTURES_DIR
  } catch {
    const fallback = path.join(app.getPath('userData'), 'captures')
    fs.mkdirSync(fallback, { recursive: true })
    return fallback
  }
}

function fileStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/* ---------- OCR（拍摄画面文字识别：Windows 系统 WinRT 引擎，简/繁/英） ---------- */

const OCR_LANG_RE = /^(chi_sim|chi_tra|eng)(\+(chi_sim|chi_tra|eng))*$/

/** Windows OCR：把语言档位映射成系统 BCP-47 标签 */
function winOcrLangTag(lang: string): string {
  if (lang.startsWith('chi_tra')) return 'zh-TW'
  if (lang.startsWith('chi_sim')) return 'zh-CN'
  return 'en-US'
}

/**
 * 用系统 PowerShell + WinRT Media.Ocr 识别图片（零依赖，Windows 10/11 自带）。
 * 结果以 UTF-8 JSON 写入 outFile，避免 stdout 中文编码问题。
 */
function runWindowsOcr(imgFile: string, outFile: string, lang: string): Promise<void> {
  const tag = winOcrLangTag(lang)
  const img = imgFile.replace(/'/g, "''")
  const out = outFile.replace(/'/g, "''")
  const script = [
    "$ErrorActionPreference='Stop'",
    "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8",
    "$null=Add-Type -AssemblyName System.Runtime.WindowsRuntime",
    "$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]",
    "$null=[Windows.Globalization.Language,Windows.Foundation,ContentType=WindowsRuntime]",
    "$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]",
    "$null=[Windows.Graphics.Imaging.BitmapPixelFormat,Windows.Graphics.Imaging,ContentType=WindowsRuntime]",
    "$null=[Windows.Graphics.Imaging.BitmapAlphaMode,Windows.Graphics.Imaging,ContentType=WindowsRuntime]",
    "$null=[Windows.Storage.StorageFile,Windows.Foundation,ContentType=WindowsRuntime]",
    "function Await($op,$t){",
    "  $m=([System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'})[0]",
    "  [void][System.WindowsRuntimeSystemExtensions]",
    "  $task=$m.MakeGenericMethod($t).Invoke($null,@($op))",
    "  $task.Wait(-1)|Out-Null",
    "  $task.Result",
    "}",
    "$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('" + tag + "'))",
    "if(-not $engine){ $engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }",
    "if(-not $engine){ [System.IO.File]::WriteAllText('" + out + "','{\"ok\":false,\"error\":\"no ocr engine for language\"}',[System.Text.Encoding]::UTF8); exit }",
    "$file=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync('" + img + "')) ([Windows.Storage.StorageFile])",
    "$stream=Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])",
    "$decoder=Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])",
    "$bmp=Await ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,[Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])",
    "$res=Await ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])",
    "$lines=@($res.Lines | ForEach-Object { $_.Text })",
    "$outObj=@{ ok=$true; text=($lines -join \"`r`n\") } | ConvertTo-Json -Compress",
    "[System.IO.File]::WriteAllText('" + out + "',$outObj,[System.Text.Encoding]::UTF8)",
  ].join('\n')
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 60000, windowsHide: true },
      (err, _stdout, stderr) => {
        if (err) {
          reject(new Error(String(stderr || err.message).slice(0, 300)))
        } else {
          resolve()
        }
      },
    )
  })
}

/** 相机页面的 IPC：info / attach / answer / candidate 转发 + 拍照录像存档 */
export function registerCameraIpc(): void {
  ipcMain.handle('camera:relay-info', async () => {
    await refreshRelayIp()
    return relayInfo
  })

  ipcMain.handle('camera:save-photo', (_e, dataUrl: string) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return { error: 'bad image data' }
    }
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    const file = path.join(ensureCapturesDir(), `photo-${fileStamp()}.jpg`)
    fs.writeFileSync(file, Buffer.from(base64, 'base64'))
    return { ok: true, file }
  })

  ipcMain.handle('camera:save-video', (_e, buf: ArrayBuffer) => {
    if (!(buf instanceof ArrayBuffer) || buf.byteLength === 0) {
      return { error: 'bad video data' }
    }
    const file = path.join(ensureCapturesDir(), `video-${fileStamp()}.webm`)
    fs.writeFileSync(file, Buffer.from(new Uint8Array(buf)))
    return { ok: true, file }
  })

  ipcMain.handle('camera:open-captures', () => {
    return shell.openPath(ensureCapturesDir())
  })

  ipcMain.handle('camera:save-text', (_e, text: string) => {
    if (typeof text !== 'string' || !text.trim()) return { error: 'empty text' }
    const file = path.join(ensureCapturesDir(), `ocr-${fileStamp()}.txt`)
    fs.writeFileSync(file, text, 'utf-8')
    return { ok: true, file }
  })

  /* ---------- Windows OCR（系统自带 WinRT 引擎，备用对比） ---------- */

  ipcMain.handle('camera:ocr-win', async (_e, dataUrl: string, lang: string) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return { error: 'bad image data' }
    }
    if (typeof lang !== 'string' || !OCR_LANG_RE.test(lang)) {
      return { error: 'bad lang' }
    }
    const tmpDir = path.join(app.getPath('userData'), 'ocr-tmp')
    try {
      fs.mkdirSync(tmpDir, { recursive: true })
      const imgFile = path.join(tmpDir, `ocr-${Date.now()}.png`)
      const outFile = `${imgFile}.json`
      fs.writeFileSync(imgFile, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'))
      try {
        await runWindowsOcr(imgFile, outFile, lang)
        const raw = fs.readFileSync(outFile, 'utf-8').replace(/^\uFEFF/, '')
        const parsed = JSON.parse(raw) as { ok: boolean; text?: string; error?: string }
        if (!parsed.ok) return { error: parsed.error || 'windows ocr failed' }
        return { ok: true, text: (parsed.text || '').replace(/\r\n/g, '\n').trim(), ms: 0 }
      } finally {
        try { fs.unlinkSync(imgFile) } catch { /* noop */ }
        try { fs.unlinkSync(outFile) } catch { /* noop */ }
      }
    } catch (err) {
      return { error: String((err as Error)?.message || err) }
    }
  })

  ipcMain.handle('camera:attach', (e) => {
    attached = e.sender
    e.sender.once('destroyed', () => {
      if (attached === e.sender) attached = null
    })
    return { attached: true, phoneConnected: !!phoneSocket }
  })

  ipcMain.handle('camera:detach', (e) => {
    if (attached === e.sender) attached = null
  })

  ipcMain.on('camera:answer', (_e, sdp: unknown) => {
    if (phoneSocket) phoneSocket.send(JSON.stringify({ type: 'answer', sdp }))
  })

  ipcMain.on('camera:candidate', (_e, candidate: unknown) => {
    if (phoneSocket) phoneSocket.send(JSON.stringify({ type: 'candidate', candidate }))
  })
}
