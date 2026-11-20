import { ipcRenderer, contextBridge } from 'electron'

// 主进程本地 API 代理端口（main.ts 经 additionalArguments 注入）
const portArg = process.argv.find((a) => a.startsWith('--api-proxy-port='))
const apiBase = portArg ? `http://127.0.0.1:${portArg.split('=')[1]}` : ''

contextBridge.exposeInMainWorld('desktopApi', { apiBase })

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(channel: string, listener: (event: any, ...args: any[]) => void) {
    return ipcRenderer.on(channel, listener)
  },
  off(channel: string, listener: (event: any, ...args: any[]) => void) {
    return ipcRenderer.off(channel, listener)
  },
  send(channel: string, ...args: any[]) {
    return ipcRenderer.send(channel, ...args)
  },
  invoke(channel: string, ...args: any[]) {
    console.log('[PRELOAD invoke]', channel, args, args.map(a => typeof a))
    return ipcRenderer.invoke(channel, ...args)
  },
})