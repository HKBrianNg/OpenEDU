// Electron 渲染进程入口。
//
// ConfigProvider 搬去 App 里了 —— 它要同时管主题 algorithm 和语言 locale，
// 这两样都跟着 settings 走，得先读到设置才定得下来。
// 这里只留 AntApp：搬过来的组件用 App.useApp() 的 message，少了这一层会报错。

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntApp } from 'antd';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AntApp>
      <App />
    </AntApp>
  </React.StrictMode>
);
