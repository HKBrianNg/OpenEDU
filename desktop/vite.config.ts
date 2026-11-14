import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
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
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: mode === 'test'
        ? undefined
        : {},
    }),
  ],
}))