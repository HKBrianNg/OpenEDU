// desktop/electron/apiProxy.ts
// 本地 API 代理：
//   渲染层 fetch('/api/...') 在打包版（file://）下没有 dev server 代理可用，
//   网页版的解法是 Cloudflare Pages Functions 同源转发（避免 *.workers.dev 直连问题）。
//   这里在主进程起一个 127.0.0.1 随机端口的 HTTP 代理，把请求转发到同一个
//   Pages 站点，复用它的转发通道；端口经 additionalArguments 传给 preload。
//
//   上游可覆盖：desktop/.env 设 VITE_DEV_API_TARGET=http://127.0.0.1:8787
//   可连本地 wrangler dev 调试后端（与 client/.env 的用法一致）。

import http from 'node:http'
import type { AddressInfo } from 'node:net'
import fs from 'node:fs'
import path from 'node:path'

// /data/* 静态文件（本地课程仓库）的 MIME 表，与 vite.config.ts 一致
const MIME: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.lrc': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

/**
 * 按文件头嗅探真实 MIME：数据仓库里部分 .jpg 实际是 WebP 内容，
 * 若按扩展名发 image/jpeg，浏览器会按 JPEG 解码并报 EncodingError（破图）。
 */
function sniffMime(file: string, fallback: string): string {
  try {
    const fd = fs.openSync(file, 'r')
    const buf = Buffer.alloc(16)
    const n = fs.readSync(fd, buf, 0, 16, 0)
    fs.closeSync(fd)
    if (n >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
    if (n >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      return 'image/webp'
    }
    if (n >= 4 && buf.toString('hex', 0, 4) === '89504e47') return 'image/png'
    if (n >= 3 && buf.toString('ascii', 0, 3) === 'GIF') return 'image/gif'
    if (n >= 4 && buf.toString('ascii', 0, 4) === '<svg') return 'image/svg+xml'
  } catch {
    /* 读不到就按扩展名 */
  }
  return fallback
}

/** 从本地数据根目录发文件，支持 Range（mp3/mp4 播放与拖动进度必需） */
function serveDataFile(req: http.IncomingMessage, res: http.ServerResponse, root: string) {
  const urlPath = decodeURIComponent((req.url || '').split('?')[0])
  const rel = urlPath.replace(/^\/data\//, '')
  const base = path.resolve(root)
  const file = path.resolve(base, rel)
  if (file !== base && !file.startsWith(base + path.sep)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`Not found: ${urlPath}`)
      return
    }
    const type = sniffMime(file, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream')
    const range = req.headers.range
    const m = range && /bytes=(\d*)-(\d*)/.exec(range)
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0
      const end = m[2] ? Math.min(parseInt(m[2], 10), st.size - 1) : st.size - 1
      if (start > end || start >= st.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${st.size}` })
        res.end()
        return
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${st.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      })
      fs.createReadStream(file, { start, end }).pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': st.size,
        'Accept-Ranges': 'bytes',
      })
      fs.createReadStream(file).pipe(res)
    }
  })
}

// 不透传给上游的请求头（host 必删；origin/referer 属于渲染层，
// 上游 worker 的 CORS 白名单不认识它们，删除即可）
const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'origin',
  'referer',
  'connection',
  'content-length',
  'accept-encoding', // 要明文响应再回给渲染层
])

// 不透传给渲染层的响应头（分块/压缩由 Node 自己处理）
const STRIP_RESPONSE_HEADERS = new Set([
  'connection',
  'transfer-encoding',
  'content-encoding',
  'content-length',
])

const UPSTREAM = process.env.VITE_DEV_API_TARGET || 'https://openedu-client.pages.dev'

export function startApiProxy(localDataRoot: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      // CORS：本地代理自己应答，不依赖上游
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.setHeader('Access-Control-Max-Age', '86400')
      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      // 本地课程数据：打包版（file://）没有 dev server 的 /data 中间件，
      // 统一由这里托管，渲染层经 desktopApi.apiBase 访问
      if ((req.url || '').startsWith('/data/')) {
        serveDataFile(req, res, localDataRoot)
        return
      }

      try {
        const url = new URL(req.url || '/', UPSTREAM)
        console.log(`[apiProxy] ${req.method} ${url.pathname}${url.search}`)
        const headers = new Headers()
        for (const [key, value] of Object.entries(req.headers)) {
          if (STRIP_REQUEST_HEADERS.has(key) || value === undefined) continue
          headers.set(key, Array.isArray(value) ? value.join(', ') : value)
        }

        const body = await new Promise<Buffer | null>((resolveBody) => {
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', () => resolveBody(chunks.length ? Buffer.concat(chunks) : null))
          req.on('error', () => resolveBody(null))
        })

        const upstream = await fetch(url, {
          method: req.method,
          headers,
          body: body ? new Uint8Array(body) : undefined,
        })
        const buf = Buffer.from(await upstream.arrayBuffer())

        upstream.headers.forEach((value, key) => {
          if (!key.startsWith('access-control-') && !STRIP_RESPONSE_HEADERS.has(key)) {
            res.setHeader(key, value)
          }
        })
        res.writeHead(upstream.status)
        res.end(buf)
      } catch (err) {
        console.error('[apiProxy] upstream error:', err)
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ code: 502, message: 'API proxy upstream unreachable' }))
      }
    })

    server.on('error', reject)
    // 0 = 随机可用端口，避免与本地 wrangler dev 的 8787 冲突
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port
      console.log(`[apiProxy] listening on http://127.0.0.1:${port} -> ${UPSTREAM}`)
      resolve(port)
    })
  })
}
