// desktop/electron/dataRoot.ts
//
// 本地数据根目录（img-library/openEDU 仓库，约 1GB）解析。
// 不打包进安装包：开发时靠 .env，打包版依次尝试
//   1) 环境变量 VITE_LOCAL_DATA
//   2) 用户配置（设置里选过，存 userData/data-root.json）
//   3) 自动探测常见位置（本机 ~/Projects/img-library/openEDU 等）
//   4) 回退 userData/openEDU（可写但为空，此时设置里可指定目录）
//
// 判断依据：目录里要有 EnglishWord/data.json（课程数据的标志文件）。

import { app, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CONFIG_FILE = path.join(app.getPath('userData'), 'data-root.json')

export function isDataRoot(p: unknown): p is string {
  if (typeof p !== 'string' || !p) return false
  try {
    return fs.existsSync(path.join(p, 'EnglishWord', 'data.json'))
  } catch {
    return false
  }
}

/** 用户显式配置过的目录（用于设置界面显示来源） */
export function configuredDataRoot(): string | null {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))?.root
    return typeof saved === 'string' && saved ? saved : null
  } catch {
    return null
  }
}

function setDataRoot(p: string) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ root: p }, null, 2), 'utf8')
}

export function resolveDataRoot(): string {
  const home = app.getPath('home')
  const driveRoot = path.parse(home).root // Windows: C:\  —— 仓库常在盘符根下的 Projects
  const candidates = [
    process.env.VITE_LOCAL_DATA,
    configuredDataRoot(),
    path.join(driveRoot, 'Projects', 'img-library', 'openEDU'),
    path.join(home, 'Projects', 'img-library', 'openEDU'),
    path.join(home, 'img-library', 'openEDU'),
    path.join(__dirname, '../../../img-library/openEDU'),
    path.join(app.getPath('documents'), 'img-library', 'openEDU'),
  ]
  for (const p of candidates) {
    if (isDataRoot(p)) return p
  }
  return path.join(app.getPath('userData'), 'openEDU')
}

/** 设置界面「更改目录」：选中后写配置，需重启生效（IPC 已在启动时绑定） */
export async function pickDataRoot(): Promise<{
  ok: boolean
  canceled?: boolean
  root?: string
  error?: string
}> {
  const res = await dialog.showOpenDialog({
    title: '选择数据目录（img-library/openEDU）',
    properties: ['openDirectory'],
  })
  if (res.canceled || !res.filePaths?.[0]) return { ok: false, canceled: true }
  const root = res.filePaths[0]
  if (!isDataRoot(root)) {
    return { ok: false, error: '所选目录里找不到 EnglishWord/data.json，请选择 img-library/openEDU 仓库' }
  }
  setDataRoot(root)
  return { ok: true, root }
}
