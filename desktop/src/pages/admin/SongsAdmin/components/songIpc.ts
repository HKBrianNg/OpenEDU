// SongsAdmin/components/songIpc.ts
import { ipcMain, dialog } from 'electron'
import type * as Electron from 'electron'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { SongRow, CourseData } from '../songTypes'

// ─── 配置（从主进程注入，避免重复读取 env）───

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

export async function readData(courseId: string): Promise<CourseData> {
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

  // 新增歌曲
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

  // 在線搜索
  ipcMain.handle('songs:search', async (_e, payload: any) => {
    const { keyword } = payload || {}
    console.log('[songs:search] keyword=', keyword)
    return { songs: [], singers: [] }
  })

  // 歌曲詳情預覽
  ipcMain.handle('songs:detail', async (_e, payload: any) => {
    try {
      const { courseId = 'ChineseSongs', songId, name, artist } = payload || {}
      const data = await readData(courseId)

      const row: SongRow = data.rows.find(
        (r: SongRow) =>
          String(r.name) === String(name) ||
          String(r.english) === String(songId) ||
          (r.name === name && r.artist === artist)
      ) || {
        category: '',
        name: '',
        english: '',
        artist: '',
        audio: false,
        lyrics: false,
      }

      let audioUrl = ''
      if (row._audioPath) {
        audioUrl = `file://${join(LOCAL_DATA_ROOT, courseId, row._audioPath.replace(/^\//, ''))}`
      }

      let lyrics = ''
      if (row._lyricPath) {
        const lyricFile = join(LOCAL_DATA_ROOT, courseId, row._lyricPath.replace(/^\//, ''))
        lyrics = await fs.readFile(lyricFile, 'utf-8').catch(() => '')
      }

      return {
        songId: songId || name || '',
        name: row.name || name || '',
        artist: row.artist || artist || '',
        audioUrl,
        duration: row.duration || 0,
        lyrics,
        category: row.category || '',
        englishName: row.english || '',
      }
    } catch (err: any) {
      console.error('[songs:detail] ERROR', err)
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

  // 在線導入
  ipcMain.handle('songs:import', async (_e, payload: any) => {
    try {
      const { song, courseId = 'ChineseSongs', category = '未分類' } = payload
      const data = await readData(courseId)

      const exists = data.rows.some(
        (r: SongRow) => r.name === song.name && r.artist === song.artist
      )
      if (!exists) {
        const newRow: SongRow = {
          category,
          name: song.name,
          english: song.english || song.name,
          artist: song.artist,
          audio: true,
          lyrics: true,
          audioName: song.audioName || `${song.name}.mp3`,
          lyricName: song.lyricName || `${song.name}.lrc`,
          _audioPath: song.audioName ? `/audio/${song.audioName}` : '',
          _lyricPath: song.lyricName ? `/lyric/${song.lyricName}` : '',
        }
        data.rows.push(newRow)
        await writeData(courseId, data)
      }
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}