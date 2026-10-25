// 主进程：拥有完整的 Node 能力（fs / child_process），渲染进程没有。
//
// 现在只是骨架：开一个窗口，把渲染进程加载出来。
// 后面「写文件 / 跑 git / 跑 yt-dlp」都加在这里，通过 ipcMain.handle 暴露，
// 并且必须校验路径，绝不让渲染进程直接传任意路径进来。

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// TOOLS_DEV=1 → 加载 vite dev server（改代码即时刷新）
// 否则加载已构建的 dist/index.html
const DEV = process.env.TOOLS_DEV === '1';
const RENDERER_URL = 'http://localhost:5174';
const distIndex = path.join(__dirname, '..', 'dist', 'index.html');

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    title: 'OpenEDU Tools',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, // 渲染进程与这里隔离，只能走 preload
      nodeIntegration: false, // 渲染进程不拿到 Node
    },
  });

  if (DEV) {
    win.loadURL(RENDERER_URL);
    return;
  }

  if (!fs.existsSync(distIndex)) {
    dialog.showErrorBox(
      '还没构建渲染进程',
      '先跑：npm run build:renderer\n（或者用 TOOLS_DEV=1 配合 npm run watch:renderer）'
    );
    app.quit();
    return;
  }
  win.loadFile(distIndex);
}

ipcMain.handle('env', () => ({
  electron: process.versions.electron,
  node: process.versions.node,
  chrome: process.versions.chrome,
  dev: DEV,
}));

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Windows / Linux：关完窗口就退出（macOS 习惯是留在后台，这里不管）
  if (process.platform !== 'darwin') app.quit();
});
