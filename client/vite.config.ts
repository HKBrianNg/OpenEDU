import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // ✅ 只保留 React 插件

export default defineConfig({
  plugins: [
    react(), // ✅ 只保留 React 插件
    // 其他 Vue 相关的配置全部删除
  ],
});