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

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isDev = !app.isPackaged
    const scriptExtra = isDev ? " 'unsafe-eval'" : ""

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';",
          "connect-src 'self' https://cdn.jsdelivr.net;",
          "media-src 'self' https://cdn.jsdelivr.net;",
          `script-src 'self' 'unsafe-inline'${scriptExtra};`,
          "style-src 'self' 'unsafe-inline';",
          "img-src 'self' https://cdn.jsdelivr.net data:;",
          "font-src 'self';",
          "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com;",
          "object-src 'none';",
          "base-uri 'self';"
        ].join(' ')
      }
    })
  })

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

  mainWindow.setMenu(null)

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
