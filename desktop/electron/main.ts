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
  // YouTube 追踪屏蔽（有用，保留）
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

  // ✅ CSP 已交给 index.html meta 管，这里删干净

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 1200,
    minHeight: 620,
    roundedCorners: true,
    webPreferences: {
      // webSecurity: false  ← 删了，index.html 的 CSP meta 已经够用
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
      preload: join(__dirname, 'preload.mjs')
    }
  })

  mainWindow.setMenu(null)

  // F12 / Ctrl+Shift+I 开关 DevTools（有用，保留）
  mainWindow.webContents.on('before-input-event', (e, input) => {
    if (!app.isPackaged) {
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