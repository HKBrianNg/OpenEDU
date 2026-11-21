// desktop/src/pages/admin/SongsAdmin/components/songIpc.ts
import { ipcMain, dialog } from 'electron'
import type * as Electron from 'electron'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'

// ─── 主进程自有类型（不依赖前端 songTypes）───

interface SongRow {
  category: string
  name: string
  english: string
  artist: string
  audio: boolean
  lyrics: boolean
  audioName?: string
  lyricName?: string
  _audioPath?: string
  _lyricPath?: string
  duration?: number
}

interface CourseData {
  rows: SongRow[]
  orphans: SongRow[]
  categories: string[]
  title?: string
  titleEn?: string
}

// ─── 配置注入 ───

let LOCAL_DATA_ROOT = ''

export function configureSongIpc(opts: { localDataRoot: string }) {
  LOCAL_DATA_ROOT = opts.localDataRoot
}

// ─── 路径工具 ───

function courseDir(courseId: string) {
  return join(LOCAL_DATA_ROOT, courseId)
}

function dataFile(courseId: string) {
  return join(courseDir(courseId), 'data.json')
}

// data.json 里的 /audio/xxx、/lyric/xxx → 本地绝对路径
function assetPath(courseId: string, rel: string): string {
  return join(courseDir(courseId), ...rel.replace(/^\/+/, '').split('/'))
}

// 只认「路径有效 + 文件真实存在」，避免 /audio/undefined 之类脏数据显示为「有」
function hasAsset(courseId: string, rel: string): boolean {
  return (
    typeof rel === 'string' &&
    rel.length > 0 &&
    !/undefined/i.test(rel) &&
    existsSync(assetPath(courseId, rel))
  )
}

// 把外部选择的文件复制进 <root>/<courseId>/<subDir>/，返回 data.json 用的相对路径。
// 不落盘的话 data.json 里的 /audio/xxx 会指向不存在的文件
async function copyIntoCourse(
  courseId: string,
  src: string,
  subDir: 'audio' | 'lyric'
): Promise<string> {
  if (!src) return ''
  const fileName = src.split(/[\\/]/).pop() || ''
  if (!fileName) return ''
  const destDir = join(courseDir(courseId), subDir)
  await fs.mkdir(destDir, { recursive: true })
  const dest = join(destDir, fileName)
  if (resolve(src) !== resolve(dest)) {
    await fs.copyFile(src, dest)
  }
  return `/${subDir}/${fileName}`
}

// ─── 数据读写 ───

async function readData(courseId: string): Promise<CourseData> {
  const file = dataFile(courseId)

  if (!existsSync(file)) {
    return { rows: [], orphans: [], categories: [] }
  }

  const raw = await fs.readFile(file, 'utf-8')
  const parsed = JSON.parse(raw)

  const rows: SongRow[] = []
  const categoryNames: string[] = []

  if (Array.isArray(parsed.categories)) {
    for (const cat of parsed.categories) {
      const catName: string = cat.name || cat.en || '未分類'
      if (!categoryNames.includes(catName)) {
        categoryNames.push(catName)
      }
      if (Array.isArray(cat.items)) {
        for (const item of cat.items) {
          const audioRel: string = typeof item.audio === 'string' ? item.audio : ''
          const lyricRel: string = typeof item.lyric === 'string' ? item.lyric : ''
          const hasAudio = hasAsset(courseId, audioRel)
          const hasLyric = hasAsset(courseId, lyricRel)
          rows.push({
            category: catName,
            name: item.name || '',
            // en 留空时后台表格显示「-」，学生端副标题不渲染
            english: item.en || '',
            artist: item.artist || '',
            audio: hasAudio,
            lyrics: hasLyric,
            audioName: hasAudio ? audioRel.replace(/^\/audio\//, '') : '',
            lyricName: hasLyric ? lyricRel.replace(/^\/lyric\//, '') : '',
            _audioPath: hasAudio ? audioRel : '',
            _lyricPath: hasLyric ? lyricRel : '',
          })
        }
      }
    }
  }

  return {
    rows,
    orphans: [],
    categories: categoryNames,
    title: parsed.title || '',
    titleEn: parsed.titleEn || '',
  }
}

async function writeData(courseId: string, data: CourseData): Promise<void> {
  const file = dataFile(courseId)
  await fs.mkdir(courseDir(courseId), { recursive: true })

  let existing: any = {}
  try {
    const raw = await fs.readFile(file, 'utf-8')
    existing = JSON.parse(raw)
  } catch {
    // ignore
  }

  const categoriesMap = new Map<string, any[]>()
  for (const row of data.rows) {
    const catName = row.category || '未分類'
    if (!categoriesMap.has(catName)) {
      categoriesMap.set(catName, [])
    }
    const audioName = row.audioName && !/undefined/i.test(row.audioName) ? row.audioName : ''
    const lyricName = row.lyricName && !/undefined/i.test(row.lyricName) ? row.lyricName : ''
    categoriesMap.get(catName)!.push({
      name: row.name,
      // en 只存已知译名，没有就留空；学生端对空 en 不渲染副标题
      en: row.english || '',
      artist: row.artist || '',
      audio: row._audioPath || (audioName ? `/audio/${audioName}` : ''),
      lyric: row._lyricPath || (lyricName ? `/lyric/${lyricName}` : ''),
    })
  }

  const categories: any[] = []
  for (const [name, items] of categoriesMap) {
    categories.push({ name, items })
  }

  const out = {
    title: existing.title || '中文歌',
    titleEn: existing.titleEn || 'Chinese Songs',
    categories,
  }

  await fs.writeFile(file, JSON.stringify(out, null, 2), 'utf-8')
}

// ─── IPC 注册 ───

export function registerSongIpc() {
  // 載入歌曲
  ipcMain.handle('songs:load', async (_e, courseId: string) => {
    try {
      const data = await readData(courseId)
      return { ok: true, data }
    } catch (err: any) {
      console.error('[songs:load] ERROR', err)
      return { ok: false, error: err.message }
    }
  })

  // 新增歌曲（本地文件）
  ipcMain.handle('songs:add', async (_e, payload: any) => {
    try {
      const { courseId, name, artist, category, audioSrc, lyricSrc } = payload
      const data = await readData(courseId)

      // 把用户选择的文件真正复制进 <root>/<courseId>/audio|lyric，否则 data.json
      // 里的 /audio/xxx 永远指向不存在的文件（旧实现只记录路径、不落盘）
      const audioRel = await copyIntoCourse(courseId, audioSrc, 'audio')
      const lyricRel = await copyIntoCourse(courseId, lyricSrc, 'lyric')

      const newRow: SongRow = {
        category: category || '未分類',
        name,
        // en 只存已知译名，不硬造：没有就留空
        english: payload.english || '',
        artist: artist || '',
        audio: !!audioRel,
        lyrics: !!lyricRel,
        audioName: audioRel ? audioRel.split('/').pop() : '',
        lyricName: lyricRel ? lyricRel.split('/').pop() : '',
        _audioPath: audioRel,
        _lyricPath: lyricRel,
      }
      data.rows.push(newRow)
      await writeData(courseId, data)

      return {
        ok: true,
        data: { item: { name, artist }, audioName: audioRel.split('/').pop() || 'unknown' },
      }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // 刪除歌曲：从 data.json 移除条目，并连带删除对应的音频/歌词文件
  ipcMain.handle('songs:remove', async (_e, payload: any) => {
    try {
      const { courseId, name, artist } = payload
      const data = await readData(courseId)

      // 先定位行拿到文件路径，再删文件、移除条目
      const target: SongRow | undefined = data.rows.find(
        (r: SongRow) => r.name === name && r.artist === artist
      )
      if (target?._audioPath) {
        await fs.rm(assetPath(courseId, target._audioPath), { force: true }).catch(() => {})
      }
      if (target?._lyricPath) {
        await fs.rm(assetPath(courseId, target._lyricPath), { force: true }).catch(() => {})
      }

      data.rows = data.rows.filter(
        (r: SongRow) => !(r.name === name && r.artist === artist)
      )
      await writeData(courseId, data)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // 编辑歌曲：更新文本字段；audioSrc/lyricSrc 提供时替换文件（旧文件随之删除）
  ipcMain.handle('songs:update', async (_e, payload: any) => {
    try {
      const { courseId, name, artist, updates, audioSrc, lyricSrc } = payload
      const data = await readData(courseId)

      const row: SongRow | undefined = data.rows.find(
        (r: SongRow) =>
          String(r.name) === String(name) && (!artist || r.artist === artist)
      )
      if (!row) {
        return { ok: false, error: `未找到歌曲：${name}` }
      }

      // 文本字段（name/artist 变化后仍按旧键定位，避免中途匹配失败）
      if (typeof updates?.category === 'string' && updates.category) row.category = updates.category
      if (typeof updates?.name === 'string' && updates.name) row.name = updates.name
      if (updates?.english !== undefined) row.english = updates.english
      if (updates?.artist !== undefined) row.artist = updates.artist

      if (audioSrc) {
        const newRel = await copyIntoCourse(courseId, audioSrc, 'audio')
        if (newRel && newRel !== row._audioPath) {
          if (row._audioPath) {
            await fs.rm(assetPath(courseId, row._audioPath), { force: true }).catch(() => {})
          }
          row._audioPath = newRel
          row.audioName = newRel.split('/').pop() || ''
          row.audio = true
        }
      }
      if (lyricSrc) {
        const newRel = await copyIntoCourse(courseId, lyricSrc, 'lyric')
        if (newRel && newRel !== row._lyricPath) {
          if (row._lyricPath) {
            await fs.rm(assetPath(courseId, row._lyricPath), { force: true }).catch(() => {})
          }
          row._lyricPath = newRel
          row.lyricName = newRel.split('/').pop() || ''
          row.lyrics = true
        }
      }

      await writeData(courseId, data)
      return { ok: true, data: { item: { name: row.name, artist: row.artist } } }
    } catch (err: any) {
      console.error('[songs:update] ERROR', err)
      return { ok: false, error: err.message }
    }
  })

  // 文件選擇器
  ipcMain.handle(
    'dialog:pick-file',
    async (
      _e: Electron.IpcMainInvokeEvent,
      opts: { kind: 'audio' | 'lyric' }
    ) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters:
          opts.kind === 'audio'
            ? [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }]
            : [{ name: 'Lyrics', extensions: ['lrc', 'txt', 'json'] }],
      })
      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0]
    }
  )

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 在線搜索
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ipcMain.handle('songs:search', async (_e, arg: any) => {
    const keyword = typeof arg === 'string' ? arg : (arg?.keyword ?? '')
    const q = String(keyword).trim()

    if (!q) {
      return { songs: [], singers: [] }
    }

    try {
      const { searchSongs } = await import('../utils/gequhai')
      const rawSongs = await searchSongs(q)

      const songs = rawSongs.map((s: any) => ({
        id: s.id || String(Math.random()),
        name: s.title || '未知歌名',
        artist: s.artist || '未知歌手',
      }))

      return { songs, singers: [] }
    } catch (err: any) {
      console.error('[songs:search] ERR:', err.message, err.stack)
      return { songs: [], singers: [] }
    }
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 歌曲詳情預覽 ← 本地有走文件，没有 fallback 到 gequhai
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ipcMain.handle('songs:detail', async (_e, payload: any) => {
    try {
      const { courseId = 'ChineseSongs', songId, name, artist } = payload || {}

      // ━━ 先查本地 ━━
      const data = await readData(courseId)

      const row: SongRow | undefined = data.rows.find(
        (r: SongRow) =>
          (name && String(r.name) === String(name) && (!artist || r.artist === artist)) ||
          (songId && (
            String(r.name).includes(String(songId)) ||
            String(r.artist).includes(String(songId)) ||
            String(r._audioPath || '').includes(String(songId))
          ))
      )

      if (row?._audioPath && existsSync(assetPath(courseId, row._audioPath))) {
        const audioFile = assetPath(courseId, row._audioPath)
        let lyrics = ''
        if (row._lyricPath && existsSync(assetPath(courseId, row._lyricPath))) {
          lyrics = await fs.readFile(assetPath(courseId, row._lyricPath), 'utf-8').catch(() => '')
        }
        const audioUrl = pathToFileURL(audioFile).href
        return {
          songId: songId || row.name || '',
          name: row.name || name || '',
          artist: row.artist || artist || '',
          audioUrl,
          duration: row.duration || 0,
          lyrics,
          category: row.category || '',
          englishName: row.english || '',
        }
      }

      // ━━ 本地没有 → fallback 到 gequhai ━━
      if (!songId) {
        return {
          songId: '',
          name: name || '',
          artist: artist || '',
          audioUrl: '',
          duration: 0,
          lyrics: '',
          category: '',
          englishName: '',
        }
      }

      const { getSongDetail } = await import('../utils/gequhai')
      const detail = await getSongDetail(songId)

      return {
        songId: songId || detail.id || '',
        name: detail.title || name || '',
        artist: detail.artist || artist || '',
        audioUrl: detail.audioUrl || '',
        duration: 0,
        lyrics: detail.lrc || detail.plainLyrics || '',
        category: '',
        englishName: '',
        audioMsg: detail.audioMsg || '',
      }
    } catch (err: any) {
      console.error('[songs:detail] ERROR', err.message, err.stack)
      return {
        songId: payload?.songId || '',
        name: '',
        artist: '',
        audioUrl: '',
        duration: 0,
        lyrics: '',
        category: '',
        englishName: '',
      }
    }
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 在線導入 ← 接收 UI 覆盖参数，音频尽力下载，歌词必落
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ipcMain.handle('songs:import', async (_e, payload: any) => {
    try {
      const {
        song,
        courseId = 'ChineseSongs',
        category = '未分類',
        audioUrl: extraAudioUrl = '',
        lyrics: extraLyrics = '',
      } = payload

      const data = await readData(courseId)

      // 去重
      const exists = data.rows.some(
        (r: SongRow) => r.name === song.name && r.artist === song.artist
      )
      if (exists) {
        return { ok: true }
      }

      // ━━ 拿详情：优先用 UI 传来的，缺啥补啥 ━━
      let detail: any = {}
      if (!extraAudioUrl || !extraLyrics) {
        try {
          const { getSongDetail } = await import('../utils/gequhai')
          detail = await getSongDetail(song.id)
        } catch (e: any) {
          console.error('[songs:import] gequhai fetch failed:', e.message)
        }
      } else {
        detail = { audioUrl: extraAudioUrl, lrc: extraLyrics }
      }

      const finalAudioUrl = extraAudioUrl || detail.audioUrl || ''
      const finalLyrics = extraLyrics || detail.lrc || detail.plainLyrics || ''

      let audioName = ''
      let lyricName = ''

      // 文件名只用歌曲名；Windows 非法字符替换为 '-'。
      // 同名文件已被占用（同名不同歌手的歌）时追加 id 区分，避免覆盖；
      // 同名同歌手的歌导入时已去重，不会走到这里
      const baseStem =
        (song.name || '')
          .replace(/[\\/:*?"<>|]/g, '-')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80) || `song-${song.id}`
      const audioDir = join(LOCAL_DATA_ROOT, courseId, 'audio')
      const lyricDir = join(LOCAL_DATA_ROOT, courseId, 'lyric')
      const [audioFiles, lyricFiles] = await Promise.all([
        fs.readdir(audioDir).catch(() => [] as string[]),
        fs.readdir(lyricDir).catch(() => [] as string[]),
      ])
      const stemTaken = [...audioFiles, ...lyricFiles].some(
        (f) => f.replace(/\.[^.]+$/, '') === baseStem
      )
      const fileStem = stemTaken ? `${baseStem}-${song.id}` : baseStem

      // ━━ 下载音频 ━━
      if (finalAudioUrl) {
        try {
          const { downloadAudio, sniffAudioExt } = await import('../utils/gequhai')
          const buf = await downloadAudio(finalAudioUrl)
          const ext = sniffAudioExt(buf) || '.mp3'
          audioName = `${fileStem}${ext}`
          await fs.mkdir(audioDir, { recursive: true })
          await fs.writeFile(join(audioDir, audioName), buf)
        } catch (e: any) {
          console.error('[songs:import] audio download failed:', e.message)
          // 不阻塞，继续落歌词
        }
      }

      // ━━ 落歌词 ━━
      if (finalLyrics) {
        lyricName = `${fileStem}.lrc`
        await fs.mkdir(lyricDir, { recursive: true })
        await fs.writeFile(join(lyricDir, lyricName), finalLyrics, 'utf-8')
      }

      // ━━ 写 data.json ━━
      // audio/lyrics 只在文件真的落盘后才标记为有；
      // 旧实现用 !!finalAudioUrl，下载失败时会写出 /audio/undefined
      const newRow: SongRow = {
        category,
        name: song.name,
        // en 只存已知译名，不硬造：没有就留空（学生端副标题为空不显示）
        english: song.english || '',
        artist: song.artist,
        audio: !!audioName,
        lyrics: !!lyricName,
        audioName: audioName || '',
        lyricName: lyricName || '',
        _audioPath: audioName ? `/audio/${audioName}` : '',
        _lyricPath: lyricName ? `/lyric/${lyricName}` : '',
      }
      data.rows.push(newRow)
      await writeData(courseId, data)

      return {
        ok: true,
        audioName,
        lyricName,
        audioStatus: audioName ? 'available' : 'missing',
      }
    } catch (err: any) {
      console.error('[songs:import] ERROR', err.message, err.stack)
      return { ok: false, error: err.message }
    }
  })
}