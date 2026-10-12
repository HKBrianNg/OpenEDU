import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { migrateLegacyStorage } from './utils/storage';
import 'antd/dist/reset.css'; // 引入 antd 的基础重置样式

// 渲染前迁移旧 localStorage key（旧散 key → openedu: 前缀，一次性、幂等）
migrateLegacyStorage();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);