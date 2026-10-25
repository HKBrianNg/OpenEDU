import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// 渲染进程就是一个普通 React 应用，只是最后被 Electron 用 file:// 加载。
// base: './' 是必须的 —— file:// 下绝对路径（/assets/xxx）会找不到文件。
export default defineConfig({
  root: path.resolve(import.meta.dirname, 'src', 'renderer'),
  base: './',
  plugins: [react()],
  server: { port: 5174 },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
});
