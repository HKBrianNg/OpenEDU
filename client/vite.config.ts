/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // .env 里的变量这里也要能读到（VITE_DEV_API_TARGET）
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/github-img": {
          target: "https://raw.githubusercontent.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/github-img/, "")
        },
        // 开发时 /api 转发到哪。
        // 默认直连线上 worker：不用本地起后端，改前端就能测；代价是改后端代码得先部署。
        // 想用本地 wrangler dev（8787）时在 .env 里设：
        //   VITE_DEV_API_TARGET=http://127.0.0.1:8787
        // 两条路都要能连到 Supabase。实测：不开 VPN 时本机 DNS 被污染、workerd 出站全挂，
        // 表现为登录返回 500 + HTML 错误页（不是 JSON）；开着就正常。
        "/api": {
          target: env.VITE_DEV_API_TARGET || "https://openedu-worker.ngshunchiang.workers.dev",
          changeOrigin: true
        }
      }
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
