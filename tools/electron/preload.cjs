// preload：渲染进程与主进程之间唯一的桥。
//
// 安全底线：nodeIntegration: false + contextIsolation: true。
// 渲染进程拿不到 require / fs / child_process，只能调这里列出来的接口。
// 以后每加一个能力（写文件、跑 git、跑 yt-dlp）都在这里显式暴露一个方法，
// 并且主进程侧必须校验路径（防 .. 穿越），别图省事开 nodeIntegration。

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  /** 环境信息，用来确认桥接通了 */
  env: () => ipcRenderer.invoke('env'),
});
