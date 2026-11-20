import { ipcRenderer, contextBridge } from 'electron'

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