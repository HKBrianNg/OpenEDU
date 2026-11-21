// desktop/electron/main.ts
import { app, BrowserWindow, Menu, session, ipcMain } from 'electron'
import type * as Electron from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

import { registerSongIpc, configureSongIpc } from '../src/pages/admin/SongsAdmin/components/songIpc'
import { resolveAudioViaRenderer } from './audioResolver'
import { startApiProxy } from './apiProxy'

// ─── __dirname 与 env ───

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../.env') })

// ─── 常量 ───

const shouldBlockTracking = process.env.BLOCK_YOUTUBE_TRACKING === 'true'
// SongsAdmin 本地曲库根目录（<root>/<courseId>/data.json）：
// - 开发模式：../img-library/openEDU（CDN 数据源仓库，编辑后可直接同步到 img-library）
// - 打包版：%APPDATA%/OpenEDU/openEDU（可写；asar/resources 内不可靠写入）
// - 可用环境变量 VITE_LOCAL_DATA 覆盖
const LOCAL_DATA_ROOT =
  process.env.VITE_LOCAL_DATA ||
  (app.isPackaged
    ? join(app.getPath('userData'), 'openEDU')
    : join(__dirname, '../../../img-library/openEDU'))

// ─── 主窗口 ───

let mainWindow: BrowserWindow | null = null

// 主进程本地 API 代理端口（whenReady 里启动后赋值，createWindow 注入 preload）
let apiProxyPort = 0

// ─── 窗口创建 ───

function createWindow() {
  if (shouldBlockTracking) {
    const filter = {
      urls: [
        'https://*.doubleclick.net/*',
        'https://www.youtube.com/api/stats/*',
        'https://www.youtube.com/youtubei/v1/log_event*',
        'https://*.googlevideo.com/*',
      ],
    }
    session.defaultSession.webRequest.onBeforeRequest(
      filter,
      (
        _details: Electron.OnBeforeRequestListenerDetails,
        cb: (response: Electron.CallbackResponse) => void
      ) => cb({ cancel: true })
    )
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 1200,
    minHeight: 620,
    roundedCorners: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
      preload: join(__dirname, 'preload.mjs'),
      webSecurity: !app.isPackaged,
      additionalArguments: [`--api-proxy-port=${apiProxyPort}`],
    },
  })

  mainWindow.setMenu(null)

  mainWindow.webContents.on(
    'before-input-event',
    (e: Electron.Event, input: Electron.Input) => {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && input.key.toLowerCase() === 'i')
      ) {
        e.preventDefault()
        if (!app.isPackaged) {
          if (mainWindow?.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools()
          } else {
            mainWindow?.webContents.openDevTools({ mode: 'detach' })
          }
        }
      }
    }
  )

  if (app.isPackaged) {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── 启动 ───

app.whenReady().then(async () => {
  // ★ 本地 API 代理：渲染层 /api/* 由主进程转发到 Pages 站点（打包版无 dev server 代理）
  apiProxyPort = await startApiProxy()

  configureSongIpc({ localDataRoot: LOCAL_DATA_ROOT })
  registerSongIpc()

  // ★ gequhai 音频解析 IPC
  ipcMain.handle(
    'gequhai:resolve-audio',
    async (_e, playId: string, mp3Type: string, songId: string) => {
      console.log('[ipc] resolve-audio', { playId, mp3Type, songId })
      return resolveAudioViaRenderer(playId, mp3Type, songId)
    }
  )

  Menu.setApplicationMenu(null)
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})