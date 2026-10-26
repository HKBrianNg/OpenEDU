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
        // 默认是 Pages 正式站而不是 worker 本尊：workers.dev 的 DNS 在本机网络下
        // 长期被污染（解析到不相干的 IP），不开 VPN 根本连不上；
        // 而 pages.dev 能直连，且走的就是线上用户同一条链路
        // （Pages Functions 代理 → worker → Supabase），测出来的行为最真实。
        // 要调 worker 本身时再改 .env：
        //   VITE_DEV_API_TARGET=http://127.0.0.1:8787   （本地 wrangler dev，需 VPN）
        "/api": {
          target: env.VITE_DEV_API_TARGET || "https://openedu-client.pages.dev",
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
