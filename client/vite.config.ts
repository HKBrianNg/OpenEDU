/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { localSavePlugin } from './vite-plugin-local-save.ts'

export default defineConfig({
  plugins: [react(), localSavePlugin()],
  server: {
    proxy: {
      "/github-img": {
        target: "https://raw.githubusercontent.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-img/, "")
      },
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
