// desktop/electron/main.ts
import { app, BrowserWindow, Menu, session, ipcMain } from 'electron'
import type * as Electron from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

import { registerSongIpc, configureSongIpc } from '../src/pages/admin/SongsAdmin/components/songIpc'
import { registerVideoIpc, configureVideoIpc } from '../src/pages/admin/VideoAdmin/components/videoIpc'
import { registerImageIpc, configureImageIpc, disposeThumbWindow } from '../src/pages/admin/ImageAdmin/components/imageIpc'
import { registerDataIpc, configureDataIpc } from '../src/pages/admin/DataAdmin/components/dataIpc'
import { registerVoiceIpc, configureVoiceIpc } from '../src/pages/admin/VoiceAdmin/components/voiceIpc'
import { resolveAudioViaRenderer } from './audioResolver'
import { startApiProxy } from './apiProxy'
import { resolveDataRoot, configuredDataRoot, pickDataRoot } from './dataRoot'
import { startCameraRelay, stopCameraRelay, registerCameraIpc } from './cameraRelay'

// ─── __dirname 与 env ───

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../.env') })

// ─── 开发实例独立 userData ───
// 打包版 productName=OpenEDU → %APPDATA%/OpenEDU；dev 默认同名同目录。
// 两者（或多个 dev 实例）同时运行会抢 Chromium 缓存，报
//   "Unable to move the cache: 拒绝访问 (0x5)" / "Gpu Cache Creation failed" /
//   "Failed to delete the database: Database IO error"。
// 开发实例改用 <原目录>-dev，与正式安装版彻底隔离；必须在 app ready 之前设置，
// 且要早于任何 session / localStorage / service worker 访问。
if (!app.isPackaged) {
  app.setPath('userData', `${app.getPath('userData')}-dev`)
}

// ─── 常量 ───

const shouldBlockTracking = process.env.BLOCK_YOUTUBE_TRACKING === 'true'
// 手机相机 WebRTC：禁用 Chromium 的 mDNS 候选混淆（*.local 主机名在热点/跨网段
// 环境下常解析不到），让 ICE 直接携带局域网真实 IP，P2P 更容易连通。
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns')
// 本地课程数据根目录（<root>/<courseId>/data.json）：
// img-library/openEDU 仓库约 1GB，不打包进安装包；由 dataRoot.ts 解析
// （.env 环境变量 > 设置里选过的目录 > 自动探测本机仓库 > 可写回退目录）
const LOCAL_DATA_ROOT = resolveDataRoot()
console.log('[dataRoot]', LOCAL_DATA_ROOT, configuredDataRoot() ? '(user configured)' : '(auto detected)')

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
  apiProxyPort = await startApiProxy(LOCAL_DATA_ROOT)

  // 数据目录设置：显示 / 更改（更改后需重启，IPC 与各管理页在启动时绑定）
  ipcMain.handle('app:get-data-root', () => ({
    root: LOCAL_DATA_ROOT,
    configured: configuredDataRoot(),
  }))
  ipcMain.handle('app:pick-data-root', () => pickDataRoot())

  configureSongIpc({ localDataRoot: LOCAL_DATA_ROOT })
  registerSongIpc()

  // ★ VideoAdmin：英文视频目录管理（yt-dlp 搜索/字幕，存储在 <root>/EnglishVideo）
  configureVideoIpc({ localDataRoot: LOCAL_DATA_ROOT })
  registerVideoIpc()

  // ★ ImageAdmin：单词配图管理（缩略图，存储在 <root>/EnglishWord/content）
  configureImageIpc({ localDataRoot: LOCAL_DATA_ROOT })
  registerImageIpc()

  // ★ DataAdmin：本地数据仓库 / CDN 镜像对照（重写自 img-library/openEDU/admin）
  configureDataIpc({ localDataRoot: LOCAL_DATA_ROOT })
  registerDataIpc()

  // ★ VoiceAdmin：课程语音生成（重写自 img-library/openEDU/tts_admin，edge-tts → msedge-tts）
  configureVoiceIpc({ localDataRoot: LOCAL_DATA_ROOT })
  registerVoiceIpc()

  // ★ gequhai 音频解析 IPC
  ipcMain.handle(
    'gequhai:resolve-audio',
    async (_e, playId: string, mp3Type: string, songId: string) => {
      console.log('[ipc] resolve-audio', { playId, mp3Type, songId })
      return resolveAudioViaRenderer(playId, mp3Type, songId)
    }
  )

  // ★ 手机相机中继：自签 https 连接页 + WebRTC 信令转发（练习 → 相机）
  registerCameraIpc()
  startCameraRelay().catch((err) => {
    console.error('[camera-relay] start failed:', err)
  })

  Menu.setApplicationMenu(null)
  createWindow()
})

app.on('window-all-closed', () => {
  disposeThumbWindow() // ImageAdmin 缩图用的隐藏窗口
  stopCameraRelay() // 手机相机中继
  if (process.platform !== 'darwin') app.quit()
})