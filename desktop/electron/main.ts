// electron/main.ts
import { app, BrowserWindow, Menu, session } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config()
const shouldBlockTracking = process.env.BLOCK_YOUTUBE_TRACKING === 'true'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let mainWindow: BrowserWindow | null

function createWindow() {
  // 如果开启屏蔽，注册网络拦截
  if (shouldBlockTracking) {
    const filter = {
      urls: [
        'https://*.doubleclick.net/*',
        'https://www.youtube.com/api/stats/*',
        'https://www.youtube.com/youtubei/v1/log_event*',
        'https://*.googlevideo.com/*'
      ]
    }
    session.defaultSession.webRequest.onBeforeRequest(filter, (_details, callback) => {
      callback({ cancel: true })
    })
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 1100,
    minHeight: 620,
    roundedCorners: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
      preload: join(__dirname, 'preload.mjs')
    }
  })

  // 移除原生菜单栏
  mainWindow.setMenu(null)

  // 快捷键监听
  mainWindow.webContents.on('before-input-event', (e, input) => {
    if (!app.isPackaged) {
      // 开发环境：F12 / Ctrl+Shift+I，独立窗口打开 devtools
      if (
        input.key === 'F12' ||
        (input.control && input.shift && input.key.toLowerCase() === 'i')
      ) {
        e.preventDefault()
        if (mainWindow?.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools()
        } else {
          mainWindow?.webContents.openDevTools({ mode: 'detach' })
        }
      }
    } else {
      // 打包后拦截调试快捷键
      if (
        input.key === 'F12' ||
        (input.control && input.shift && input.key.toLowerCase() === 'i')
      ) {
        e.preventDefault()
      }
    }
  })

  if (app.isPackaged) {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
