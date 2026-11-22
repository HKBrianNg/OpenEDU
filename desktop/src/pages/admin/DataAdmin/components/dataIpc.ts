// desktop/src/pages/admin/DataAdmin/components/dataIpc.ts
//
// DataAdmin 主进程 IPC：本地仓库扫描/读文本 + CDN 探测/取文本/清缓存/外部打开。
// 重写自 img-library/openEDU/admin/main.py（PySide6 CDN Manager）。
// 渲染层不直接触达文件系统或任意 URL，所有网络请求走主进程（不受 CSP / CORS 限制）。

import { ipcMain, shell, net } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

import type { DataEntry, TextResult, ProbeResult, IpcResult } from '../dataTypes'

let LOCAL_DATA_ROOT = ''

export function configureDataIpc(opts: { localDataRoot: string }) {
  LOCAL_DATA_ROOT = opts.localDataRoot
}

// ─── 与 Python config.py 保持一致 ───
const CDN_PATH_PREFIX = 'openEDU'
const GITHUB_USER = 'HKBrianNg'
const REPO_NAME = 'img-library'
const BRANCH = 'main'
const PURGE_BASE = 'https://purge.jsdelivr.net'

// 与 Python HIDDEN_NAMES / config.py SCAN_SKIP 一致
const SCAN_SKIP = new Set([
  '.vscode', 'admin', 'public', 'readme.md', 'tts_admin', '.venv',
  '__pycache__', '.git', '.idea', 'node_modules',
])

// 精简请求头：net.fetch 走 Chromium 栈会自动带 UA / Referer，
// 自定义 User-Agent / Referer 属于 forbidden header，传了会被忽略甚至报错。
const REQUEST_HEADERS: Record<string, string> = {
  Accept: '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

// 文本预览最大读取量，避免大 JSON 卡死渲染层
const MAX_TEXT = 512 * 1024

const PROBE_TIMEOUT = 20000
const TEXT_TIMEOUT = 20000
const PURGE_TIMEOUT = 15000

/**
 * 用 Electron net.fetch（Chrome 网络栈）发请求，与 app 内浏览器行为一致：
 * 系统代理、DNS / IPv6、证书、缓存全部复用。此前用 Node 的 fetch(undici)，
 * 冷启动连接偶发卡死超过 8s，导致「浏览器能打开、探测却 timeout」。
 * 超时用 AbortController + setTimeout，跨 Chromium / Node 栈比
 * AbortSignal.timeout 更可靠。
 */
function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  return net.fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer))
}

/** 相对路径 → 绝对路径，禁止越出数据根 */
function safeResolve(rel: string): string | null {
  const base = path.resolve(LOCAL_DATA_ROOT)
  const full = path.resolve(base, rel || '.')
  if (full !== base && !full.startsWith(base + path.sep)) return null
  return full
}

/** 只允许 jsDelivr 系域名，避免渲染层借主进程发起任意请求 */
function isJsDelivrUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase()
    return h === 'jsdelivr.net' || h.endsWith('.jsdelivr.net')
  } catch {
    return false
  }
}

/** UTF-8 优先，失败回退 GBK（与 Python 版一致） */
function decodeText(buf: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    try {
      return new TextDecoder('gbk').decode(buf)
    } catch {
      return buf.toString('utf8')
    }
  }
}

function encodeRel(rel: string): string {
  return rel.split('/').map(encodeURIComponent).join('/')
}

/** 单次探测：一次 GET（Range 读前 32KB）同时验证状态码与内容可取。
 *  不再先发 HEAD——冷启动时两次往返容易各卡一次超时；且浏览器打开走的就是 GET。
 *  流式读到上限即取消，避免选中大视频时把整个文件下载下来。 */
async function probeOnce(url: string): Promise<ProbeResult> {
  const started = Date.now()
  const r = await fetchWithTimeout(
    url,
    { method: 'GET', headers: { ...REQUEST_HEADERS, Range: 'bytes=0-32767' } },
    PROBE_TIMEOUT,
  )
  const reader = r.body?.getReader()
  let bytes = 0
  if (reader) {
    try {
      while (bytes < 32768) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value?.byteLength ?? 0
      }
    } finally {
      await reader.cancel().catch(() => {})
    }
  }
  const ms = Date.now() - started
  if (!r.ok) {
    return { ok: false, status: r.status, size: 0, bytes: 0, ms, message: `HTTP ${r.status}` }
  }
  return {
    ok: true,
    status: r.status,
    size: bytes,
    bytes,
    ms,
    message: 'OK (GET + stream)',
  }
}

export function registerDataIpc() {
  // ─── 懒加载列目录（1GB 仓库不全量递归，展开到哪扫到哪）───
  ipcMain.handle('data:list-dir', async (_e, rel: string): Promise<IpcResult<DataEntry[]>> => {
    const dir = safeResolve(rel)
    if (!dir) return { ok: false, error: 'invalidPath' }
    try {
      const names = fs.readdirSync(dir)
      const entries: DataEntry[] = []
      for (const name of names) {
        if (name.startsWith('.') || SCAN_SKIP.has(name.toLowerCase())) continue
        const full = path.join(dir, name)
        let st: fs.Stats
        try {
          st = fs.statSync(full)
        } catch {
          continue
        }
        const isDir = st.isDirectory()
        entries.push({
          key: path.posix.join(rel || '.', name),
          title: name,
          isDir,
          size: st.size,
          mtime: st.mtimeMs,
          ext: isDir ? '' : path.extname(name).slice(1).toLowerCase(),
        })
      }
      // 目录在前、同类按名称排序
      entries.sort((a, b) =>
        a.isDir === b.isDir ? a.title.localeCompare(b.title) : a.isDir ? -1 : 1,
      )
      return { ok: true, data: entries }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  // ─── 本地文本读取（截断保护 + 编码回退）───
  ipcMain.handle('data:read-text', async (_e, rel: string): Promise<IpcResult<TextResult>> => {
    const file = safeResolve(rel)
    if (!file) return { ok: false, error: 'invalidPath' }
    try {
      const st = fs.statSync(file)
      if (!st.isFile()) return { ok: false, error: 'notAFile' }
      const len = Math.min(st.size, MAX_TEXT)
      const buf = Buffer.alloc(len)
      const fd = fs.openSync(file, 'r')
      try {
        fs.readSync(fd, buf, 0, len, 0)
      } finally {
        fs.closeSync(fd)
      }
      return {
        ok: true,
        data: { text: decodeText(buf), size: st.size, truncated: st.size > MAX_TEXT },
      }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  // ─── CDN 探测（GET + stream 验证，最多 3 次，与 Python 重试策略一致）───
  ipcMain.handle('data:probe-cdn', async (_e, url: string): Promise<IpcResult<ProbeResult>> => {
    if (!isJsDelivrUrl(url)) return { ok: false, error: 'invalidUrl' }
    let last: ProbeResult = {
      ok: false, status: 0, size: 0, bytes: 0, ms: 0, message: 'unknownError',
    }
    for (let i = 0; i < 3; i += 1) {
      const started = Date.now()
      try {
        return { ok: true, data: await probeOnce(url) }
      } catch (err) {
        const e = err as Error
        const ms = Date.now() - started
        const timedOut = e.name === 'AbortError' || e.name === 'TimeoutError'
        last = {
          ok: false,
          status: 0,
          size: 0,
          bytes: 0,
          ms,
          message: timedOut ? `timeout (${(ms / 1000).toFixed(1)}s)` : `${e.name}: ${e.message.slice(0, 100)}`,
        }
      }
    }
    return { ok: true, data: last }
  })

  // ─── 取远端文本（用于本地/CDN 内容比对；Chrome 网络栈自动处理 gzip/br）───
  ipcMain.handle('data:fetch-cdn-text', async (_e, url: string): Promise<IpcResult<TextResult>> => {
    if (!isJsDelivrUrl(url)) return { ok: false, error: 'invalidUrl' }
    try {
      const r = await fetchWithTimeout(
        url,
        { headers: REQUEST_HEADERS },
        TEXT_TIMEOUT,
      )
      if (!r.ok) return { ok: false, status: r.status, error: `HTTP ${r.status}` }
      const buf = Buffer.from(await r.arrayBuffer())
      return {
        ok: true,
        data: {
          text: decodeText(buf.subarray(0, MAX_TEXT)),
          size: buf.length,
          truncated: buf.length > MAX_TEXT,
        },
      }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  // ─── 清 CDN 缓存 ───
  // Python 版把整段 CDN URL 拼到 purge 后面（https://purge.jsdelivr.net/https://...），
  // 与 jsDelivr 官方 /gh/user/repo@branch/path 格式不符；这里先试标准格式，
  // 失败再兼容旧格式。
  ipcMain.handle(
    'data:purge-cdn',
    async (_e, rel: string, cdnBase: string): Promise<IpcResult<{ status: number; url: string }>> => {
      const cdnUrl = `${cdnBase}/${CDN_PATH_PREFIX}/${encodeRel(rel)}`
      const candidates = [
        `${PURGE_BASE}/gh/${GITHUB_USER}/${REPO_NAME}@${BRANCH}/${CDN_PATH_PREFIX}/${encodeRel(rel)}`,
        `${PURGE_BASE}/${cdnUrl}`,
      ]
      let status = 0
      for (const url of candidates) {
        try {
          const r = await fetchWithTimeout(url, { headers: REQUEST_HEADERS }, PURGE_TIMEOUT)
          status = r.status
          if (r.status === 200 || r.status === 204) {
            return { ok: true, data: { status: r.status, url } }
          }
        } catch {
          /* 试下一个格式 */
        }
      }
      return { ok: false, status, error: 'purgeFailed' }
    },
  )

  // ─── 系统浏览器打开 CDN URL ───
  ipcMain.handle('data:open-external', async (_e, url: string): Promise<IpcResult<null>> => {
    if (!isJsDelivrUrl(url)) return { ok: false, error: 'invalidUrl' }
    try {
      await shell.openExternal(url)
      return { ok: true, data: null }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })
}
