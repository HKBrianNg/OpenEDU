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

export function startApiProxy(): Promise<number> {
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
