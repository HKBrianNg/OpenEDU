// desktop/src/pages/admin/ImageAdmin/components/imageIpc.ts
//
// EnglishWord 单词配图管理的主进程逻辑 + IPC 注册。
// 从 tools/electron/wordimages.cjs 移植，存储用 desktop 的 LOCAL_DATA_ROOT：
//   <root>/EnglishWord/data.json            章节索引 { chapters:[{name, en, contentLink}] }
//   <root>/EnglishWord/<年级>.json           词表数组 [{name, en, url, ...}]（在课程根目录，非 content/）
//   <root>/EnglishWord/content/             原图（{en-slug}.jpg，url 字段可覆盖）
//   <root>/EnglishWord/content/thumb/       缩略图（与原图同名，长边 400px WebP q0.72）
//
// 缩图不用 sharp（避免 Electron ABI rebuild），用隐藏 BrowserWindow 的 canvas 编码；
// 与 img-library scripts/gen-thumbs.mjs 参数对齐。

import { ipcMain } from 'electron'
import { BrowserWindow } from 'electron'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'

// ─── 配置注入 ───

let LOCAL_DATA_ROOT = ''

export function configureImageIpc(opts: { localDataRoot: string }) {
  LOCAL_DATA_ROOT = opts.localDataRoot
}

// ─── 常量与基础工具 ───

const COURSE_ID = 'EnglishWord'
const IMG_RE = /\.(jpe?g|png|webp)$/i
const LONG_EDGE = 400
const QUALITY = 0.72

const courseSub = (...parts: string[]) => {
  const abs = join(LOCAL_DATA_ROOT, COURSE_ID, ...parts)
  if (!abs.startsWith(join(LOCAL_DATA_ROOT, COURSE_ID))) throw new Error('路径越界')
  return abs
}

function readJson<T = any>(f: string): T {
  return JSON.parse(readFileSync(f, 'utf8'))
}

/** 保留原 JSON 的换行风格写回，避免无意义 diff */
function writeJsonLike(file: string, src: string, data: unknown) {
  const eol = src.includes('\r\n') ? '\r\n' : '\n'
  const endNl = /(\r?\n)\s*$/.exec(src)
  writeFileSync(
    file,
    JSON.stringify(data, null, 2).replace(/\n/g, eol) + (endNl ? endNl[1] : ''),
    'utf8'
  )
}

/** "apple pie" → "apple-pie"；规则与前端 utils/image.ts 的 getImageName 一致 */
function toFileSlug(en: string): string {
  return String(en ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** 词 → content/ 里的图片文件名：url 字段优先，否则按英文名推导 */
function imageFileOf(item: any): { file: string; fromUrl: boolean } {
  const url = String(item?.url ?? '').trim()
  if (url) return { file: url.replace(/^\/+/, ''), fromUrl: true }
  return { file: `${toFileSlug(item?.en ?? '')}.jpg`, fromUrl: false }
}

/** 扫一层目录，返回「文件名 → 字节数」（只认图片扩展名） */
function scanDir(dir: string): Map<string, number> {
  const m = new Map<string, number>()
  let names: string[] = []
  try {
    names = readdirSync(dir)
  } catch {
    return m
  }
  names.forEach((f) => {
    if (!IMG_RE.test(f)) return
    try {
      const st = statSync(join(dir, f))
      if (st.isFile()) m.set(f, st.size)
    } catch {
      /* 并发删除时可能消失 */
    }
  })
  return m
}

/** 读全量配图状态：每个词一行（含原图/缩略图存在性与字节数） */
function loadWordImages() {
  const contentDir = courseSub('content')
  const thumbDir = courseSub('content', 'thumb')
  const originals = scanDir(contentDir)
  const thumbs = scanDir(thumbDir)

  const index = readJson<any>(courseSub('data.json'))
  const chapters = Array.isArray(index?.chapters) ? index.chapters : []

  const rows: any[] = []
  const problems: string[] = []

  chapters.forEach((c: any) => {
    const link = String(c.contentLink ?? '')
    if (!link) return
    let items: any[]
    try {
      // 章节文件在课程根目录（跟 KnowledgeBase 放 content/ 下的约定不同）
      items = readJson<any[]>(courseSub(link))
    } catch {
      problems.push(`「${c.name}」${link} 不存在`)
      return
    }
    if (!Array.isArray(items)) {
      problems.push(`「${c.name}」${link} 不是数组`)
      return
    }

    items.forEach((it, i) => {
      const { file, fromUrl } = imageFileOf(it)
      const imageBytes = originals.get(file) ?? 0
      const thumbBytes = thumbs.get(file) ?? 0
      rows.push({
        key: `${link}#${i}`,
        contentLink: link,
        chapter: c.name ?? link.replace(/\.json$/i, ''),
        chapterEn: c.en ?? '',
        index: i,
        name: it?.name ?? '',
        en: it?.en ?? '',
        file,
        fromUrl,
        hasImage: imageBytes > 0,
        imageBytes,
        hasThumb: thumbBytes > 0,
        thumbBytes,
      })
    })
  })

  const counts = {
    total: rows.length,
    withImage: rows.filter((r) => r.hasImage).length,
    withThumb: rows.filter((r) => r.hasThumb).length,
    missingThumb: rows.filter((r) => r.hasImage && !r.hasThumb).length,
    uniqueImages: originals.size,
    uniqueThumbs: [...thumbs.keys()].filter((f) => originals.has(f)).length,
  }

  return { rows, problems, counts }
}

// ─── 缩略图：隐藏窗口 canvas 编码 ───

let thumbWin: BrowserWindow | null = null

function ensureThumbWindow(): BrowserWindow {
  if (thumbWin && !thumbWin.isDestroyed()) return thumbWin
  thumbWin = new BrowserWindow({ show: false })
  thumbWin.loadURL('about:blank')
  return thumbWin
}

export function disposeThumbWindow() {
  if (thumbWin && !thumbWin.isDestroyed()) thumbWin.destroy()
  thumbWin = null
}

function mimeOf(file: string): string {
  const ext = file.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? 'jpg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

/**
 * 给一张原图生成缩略图（长边 400px WebP q0.72；只会缩小不会放大）。
 * copied=true：编码出的 webp 比原图还大（本来就是小图）时直接复制原图，
 * 保证 thumb/ 里每个名字都有文件，前台不会先 404 再回退。
 */
async function genOneThumb(src: string, file: string) {
  const outDir = courseSub('content', 'thumb')
  mkdirSync(outDir, { recursive: true })
  const out = courseSub('content', 'thumb', file)

  const srcBuf = readFileSync(src)
  const dataUrl = `data:${mimeOf(file)};base64,${srcBuf.toString('base64')}`
  const win = ensureThumbWindow()

  const js = `
    (async () => {
      const img = new Image();
      const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      img.src = ${JSON.stringify(dataUrl)};
      await loaded;
      const scale = Math.min(1, ${LONG_EDGE} / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/webp', ${QUALITY});
    })()
  `

  let outUrl: string
  try {
    outUrl = await win.webContents.executeJavaScript(js)
  } catch (err: any) {
    throw new Error(`缩图执行失败：${err?.message ?? err}`)
  }

  // 浏览器不支持 webp 编码时会静默退回 png —— 宁可报错也不写名不副实的文件
  if (!outUrl?.startsWith('data:image/webp;base64,')) {
    throw new Error('缩图编码失败（webp 编码不可用）')
  }

  const outBuf = Buffer.from(outUrl.slice('data:image/webp;base64,'.length), 'base64')
  if (outBuf.length >= srcBuf.length) {
    copyFileSync(src, out)
    return { ok: true, bytes: srcBuf.length, copied: true }
  }
  writeFileSync(out, outBuf)
  return { ok: true, bytes: outBuf.length, copied: false }
}

/** 批量生成缩略图。files 为空 = 自动补所有「有原图没缩略图」的 */
async function genThumbs(files: string[], onProgress: (p: any) => void) {
  const { rows } = loadWordImages()
  const wanted = new Set(files ?? [])
  const targets = wanted.size
    ? rows.filter((r) => wanted.has(r.file) && r.hasImage)
    : rows.filter((r) => r.hasImage && !r.hasThumb)

  const results: any[] = []
  const n = targets.length
  for (let i = 0; i < n; i++) {
    const r = targets[i]
    onProgress({ n: i + 1, total: n, file: r.file, name: r.name, stage: 'start' })
    try {
      const one = await genOneThumb(courseSub('content', r.file), r.file)
      results.push({ key: r.key, file: r.file, ...one })
      onProgress({ n: i + 1, total: n, file: r.file, name: r.name, stage: 'done', ok: true, copied: one.copied })
    } catch (err: any) {
      results.push({ key: r.key, file: r.file, ok: false, error: err?.message ?? String(err) })
      onProgress({ n: i + 1, total: n, file: r.file, name: r.name, stage: 'done', ok: false, error: err?.message ?? String(err) })
    }
  }
  return { results, ok: results.every((r) => r.ok) }
}

// ─── 导入 / 删除 ───

function locate(contentLink: string, index: number) {
  const link = String(contentLink ?? '')
  const items = readJson<any[]>(courseSub(link))
  if (!Array.isArray(items)) throw new Error(`${link} 不是数组`)
  const i = Number(index ?? -1)
  if (!(i >= 0 && i < items.length)) throw new Error(`${link} 下标越界：${index}`)
  return { items, i }
}

/**
 * 给单个词配图：复制原图进 content/（文件名按 url/英文名既有规则，不沿用源文件名，
 * 直接覆盖）→ 顺手生成缩略图 → 文件名推不出来时把实际文件名回写 url 字段。
 */
async function importWordImage(payload: { contentLink: string; index: number; srcPath: string }) {
  const src = String(payload?.srcPath ?? '').trim()
  if (!src || !existsSync(src)) throw new Error(`文件不存在：${src || '(空)'}`)
  if (!IMG_RE.test(src)) throw new Error('只支持 jpg / png / webp 图片')

  const { items, i } = locate(payload?.contentLink, payload?.index)
  const item = items[i]
  const { file, fromUrl } = imageFileOf(item)

  // 原图直接复制，用户在别处压好的图不该被我们再压一次
  const contentDir = courseSub('content')
  mkdirSync(contentDir, { recursive: true })
  const buf = readFileSync(src)
  writeFileSync(courseSub('content', file), buf)

  // 文件名不是按英文名推出来的（url 指到了非常规名字）→ 回写 url，不然前台找不到
  let wroteUrl = false
  if (!fromUrl && file !== `${toFileSlug(item?.en ?? '')}.jpg`) {
    const link = String(payload?.contentLink ?? '')
    const gradeFile = courseSub(link)
    const raw = readFileSync(gradeFile, 'utf8')
    item.url = file
    writeJsonLike(gradeFile, raw, items)
    wroteUrl = true
  }

  const thumb = await genOneThumb(courseSub('content', file), file)
  return { ok: true, file, bytes: buf.length, wroteUrl, thumb, name: item?.name, en: item?.en }
}

/**
 * 删词的配图：先清 url 字段（写失败不会留死链），再删原图和缩略图。
 */
async function deleteWordImage(payload: { contentLink: string; index: number }) {
  const { items, i } = locate(payload?.contentLink, payload?.index)
  const item = items[i]
  const { file, fromUrl } = imageFileOf(item)

  let clearedUrl = false
  if (fromUrl) {
    const link = String(payload?.contentLink ?? '')
    const gradeFile = courseSub(link)
    const raw = readFileSync(gradeFile, 'utf8')
    delete item.url
    writeJsonLike(gradeFile, raw, items)
    clearedUrl = true
  }

  const removed: string[] = []
  for (const rel of [file, join('thumb', file)]) {
    const abs = courseSub('content', rel)
    if (existsSync(abs)) {
      unlinkSync(abs)
      removed.push(rel.replace(/\\/g, '/'))
    }
  }
  return { ok: true, file, removed, clearedUrl, name: item?.name }
}

// ─── IPC 注册 ───

export function registerImageIpc() {
  ipcMain.handle('wordimages:load', async () => {
    try {
      return { ok: true, ...loadWordImages() }
    } catch (err: any) {
      console.error('[wordimages:load] ERROR', err.message)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('wordimages:import', async (_e, payload: any) => {
    try {
      return await importWordImage(payload)
    } catch (err: any) {
      console.error('[wordimages:import] ERROR', err.message)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('wordimages:gen-thumbs', async (e, payload: any) => {
    try {
      const push = (p: any) => {
        try {
          e.sender.send('wordimages:progress', p)
        } catch {
          /* 窗口已关 */
        }
      }
      const data = await genThumbs(payload?.files ?? [], push)
      return { ok: true, data }
    } catch (err: any) {
      console.error('[wordimages:gen-thumbs] ERROR', err.message)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('wordimages:delete', async (_e, payload: any) => {
    const items: any[] = Array.isArray(payload) ? payload : []
    if (items.length === 0) return { ok: false, error: '没有勾选任何条目' }
    const results: any[] = []
    for (const it of items) {
      try {
        const one = await deleteWordImage(it)
        results.push({ key: `${it?.contentLink}#${it?.index}`, ...one })
      } catch (err: any) {
        results.push({ key: `${it?.contentLink}#${it?.index}`, ok: false, error: err?.message })
      }
    }
    return { ok: true, data: { results, ok: results.every((r) => r.ok) } }
  })
}
