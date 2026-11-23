import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

// VITE_USE_LOCAL_DATA=true 时，把 dev server 的 /data/* 映射到 VITE_LOCAL_DATA 本地目录，
// 与 coursePath.ts 本地模式的 /data/<courseId> 请求对应（渲染层代码与网页保持一致，不改）
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

function serveLocalData(localRoot: string): Plugin {
  const root = path.resolve(localRoot)
  return {
    name: 'serve-local-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        try {
          const rel = decodeURIComponent((req.url || '').split('?')[0])
          const file = path.join(root, rel)
          // 防目录穿越
          if (!file.startsWith(root + path.sep) && file !== root) return next()
          if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return next()
          res.setHeader(
            'Content-Type',
            MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
          )
          fs.createReadStream(file).pipe(res)
        } catch {
          next()
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname)
  const useLocalData = env.VITE_USE_LOCAL_DATA === 'true' && !!env.VITE_LOCAL_DATA

  return {
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
          // rewrite: (path) => path.replace(/^\/api/, ''),
          headers: {
            Host: '127.0.0.1:8787',
            Origin: 'http://127.0.0.1:8787'
          }
        }
      }
    },
    plugins: [
      react(),
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            build: {
              rollupOptions: {
                // msedge-tts（VoiceAdmin 的 TTS 引擎）依赖 ws 等运行时 CJS 包，
                // 被 vite 内联打包后 ws 的帧掩码模块会 broken（"e.mask is not a function"），
                // 因此整体 external，随 node_modules 打进安装包。
                external: ['msedge-tts', 'ws', 'isomorphic-ws', 'axios', 'buffer', 'stream-browserify'],
              },
            },
          },
        },
        preload: {
          input: path.join(__dirname, 'electron/preload.ts'),
        },
        renderer: mode === 'test'
          ? undefined
          : {},
      }),
      ...(useLocalData ? [serveLocalData(env.VITE_LOCAL_DATA)] : []),
    ],
  }
})
