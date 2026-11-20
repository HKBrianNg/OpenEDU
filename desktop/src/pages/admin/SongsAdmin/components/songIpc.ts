// desktop/src/pages/admin/SongsAdmin/components/songIpc.ts
import { ipcMain, dialog } from 'electron'
import type * as Electron from 'electron'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
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

// ─── 数据读写 ───

async function readData(courseId: string): Promise<CourseData> {
  const file = dataFile(courseId)
  console.log('[readData] courseId=', courseId)
  console.log('[readData] file=', file)
  console.log('[readData] exists=', existsSync(file))

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
          rows.push({
            category: catName,
            name: item.name || '',
            english: item.en || item.name || '',
            artist: item.artist || '',
            audio: !!item.audio,
            lyrics: !!item.lyric,
            audioName: item.audio ? item.audio.replace(/^\/audio\//, '') : '',
            lyricName: item.lyric ? item.lyric.replace(/^\/lyric\//, '') : '',
            _audioPath: item.audio || '',
            _lyricPath: item.lyric || '',
          })
        }
      }
    }
  }

  console.log('[readData] rows=', rows.length, 'categories=', categoryNames.length)

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
    categoriesMap.get(catName)!.push({
      name: row.name,
      en: row.english || row.name,
      artist: row.artist || '',
      audio: row._audioPath || (row.audio ? `/audio/${row.audioName}` : ''),
      lyric: row._lyricPath || (row.lyrics ? `/lyric/${row.lyricName}` : ''),
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
  console.log('[writeData] written', file, 'rows=', data.rows.length)
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

      const audioName = audioSrc ? audioSrc.split(/[\\/]/).pop() : ''
      const lyricName = lyricSrc ? lyricSrc.split(/[\\/]/).pop() : ''

      const newRow: SongRow = {
        category: category || '未分類',
        name,
        english: payload.english || name,
        artist: artist || '',
        audio: !!audioSrc,
        lyrics: !!lyricSrc,
        audioName,
        lyricName,
        _audioPath: audioSrc ? `/audio/${audioName}` : '',
        _lyricPath: lyricSrc ? `/lyric/${lyricName}` : '',
      }
      data.rows.push(newRow)
      await writeData(courseId, data)

      return {
        ok: true,
        data: { item: { name, artist }, audioName: audioName || 'unknown' },
      }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // 刪除歌曲
  ipcMain.handle('songs:remove', async (_e, payload: any) => {
    try {
      const { courseId, name, artist } = payload
      const data = await readData(courseId)
      data.rows = data.rows.filter(
        (r: SongRow) => !(r.name === name && r.artist === artist)
      )
      await writeData(courseId, data)
      return { ok: true }
    } catch (err: any) {
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

    console.log('[songs:search] keyword=', q, '| raw arg type=', typeof arg)

    if (!q) {
      return { songs: [], singers: [] }
    }

    try {
      const { searchSongs } = await import('../utils/gequhai')
      const rawSongs = await searchSongs(q)

      if (rawSongs.length > 0) {
        console.log('[songs:search] raw first item:', JSON.stringify(rawSongs[0]))
      }
      console.log('[songs:search] parsed count:', rawSongs.length)

      const songs = rawSongs.map((s: any) => ({
        id: s.id || String(Math.random()),
        name: s.title || '未知歌名',
        artist: s.artist || '未知歌手',
      }))

      console.log('[songs:search] mapped first:', JSON.stringify(songs[0]))

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
      console.log('[songs:detail] songId=', songId, 'name=', name, 'artist=', artist)

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

      if (row?._audioPath) {
        const audioFile = join(LOCAL_DATA_ROOT, courseId, row._audioPath.replace(/^\/+/, ''))
        let lyrics = ''
        if (row._lyricPath) {
          const lyricFile = join(LOCAL_DATA_ROOT, courseId, row._lyricPath.replace(/^\/+/, ''))
          lyrics = await fs.readFile(lyricFile, 'utf-8').catch(() => '')
        }
        const audioUrl = pathToFileURL(audioFile).href
        console.log('[songs:detail] from local file, audioUrl=', audioUrl.slice(0, 60))
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
        console.log('[songs:detail] no songId, cannot fetch from gequhai')
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

      console.log('[songs:detail] fetching from gequhai:', songId)
      const { getSongDetail } = await import('../utils/gequhai')
      const detail = await getSongDetail(songId)

      console.log(
        '[songs:detail] gequhai audioCode=',
        detail.audioCode,
        'hasAudio=',
        !!detail.audioUrl,
        'lrcLen=',
        (detail.lrc || '').length
      )

      return {
        songId: songId || detail.id || '',
        name: detail.title || name || '',
        artist: detail.artist || artist || '',
        audioUrl: detail.audioUrl || '',
        duration: 0,
        lyrics: detail.lrc || detail.plainLyrics || '',
        category: '',
        englishName: '',
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
      console.log('[songs:import] song=', song?.name, 'courseId=', courseId, 'hasExtraAudio=', !!extraAudioUrl, 'hasExtraLyrics=', !!extraLyrics)

      const data = await readData(courseId)

      // 去重
      const exists = data.rows.some(
        (r: SongRow) => r.name === song.name && r.artist === song.artist
      )
      if (exists) {
        console.log('[songs:import] already exists, skip')
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

      // ━━ 下载音频 ━━
      if (finalAudioUrl) {
        console.log('[songs:import] downloading audio...')
        try {
          const { downloadAudio, sniffAudioExt } = await import('../utils/gequhai')
          const buf = await downloadAudio(finalAudioUrl)
          const ext = sniffAudioExt(buf) || '.mp3'
          audioName = `${song.id}_${Date.now()}${ext}`
          const audioDir = join(LOCAL_DATA_ROOT, courseId, 'audio')
          await fs.mkdir(audioDir, { recursive: true })
          await fs.writeFile(join(audioDir, audioName), buf)
          console.log('[songs:import] audio saved:', audioName)
        } catch (e: any) {
          console.error('[songs:import] audio download failed:', e.message)
          // 不阻塞，继续落歌词
        }
      } else {
        console.warn('[songs:import] no audioUrl available')
      }

      // ━━ 落歌词 ━━
      if (finalLyrics) {
        lyricName = `${song.id}_${Date.now()}.lrc`
        const lyricDir = join(LOCAL_DATA_ROOT, courseId, 'lyric')
        await fs.mkdir(lyricDir, { recursive: true })
        await fs.writeFile(join(lyricDir, lyricName), finalLyrics, 'utf-8')
        console.log('[songs:import] lyric saved:', lyricName)
      } else {
        console.warn('[songs:import] no lyrics available')
      }

      // ━━ 写 data.json ━━
      const newRow: SongRow = {
        category,
        name: song.name,
        english: song.english || song.name,
        artist: song.artist,
        audio: !!finalAudioUrl,
        lyrics: !!finalLyrics,
        audioName: audioName || undefined,
        lyricName: lyricName || undefined,
        _audioPath: audioName ? `/audio/${audioName}` : '',
        _lyricPath: lyricName ? `/lyric/${lyricName}` : '',
      }
      data.rows.push(newRow)
      await writeData(courseId, data)

      console.log('[songs:import] done, ok=true, audioStatus=', finalAudioUrl ? 'available' : 'missing')
      return {
        ok: true,
        audioName,
        lyricName,
        audioStatus: finalAudioUrl ? 'available' : 'missing',
      }
    } catch (err: any) {
      console.error('[songs:import] ERROR', err.message, err.stack)
      return { ok: false, error: err.message }
    }
  })
}