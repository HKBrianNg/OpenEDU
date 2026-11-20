import { ipcMain } from 'electron'
import * as gequhai from './utils/gequhai'

export function registerIpcHandlers() {
  // ── 搜索歌曲 ──
  ipcMain.handle('songs:search', async (_e, keyword: string) => {
    const q = String(keyword ?? '').trim()
    console.log('[songs:search] keyword =', q)
    if (!q) return { ok: false, songs: [], singers: [], error: 'empty keyword' }
    try {
      const songs = await gequhai.searchSongs(q)
      console.log('[songs:search] count =', songs.length)
      return { ok: true, songs, singers: [] }
    } catch (err: any) {
      console.error('[songs:search] ERR:', err.message)
      return { ok: false, songs: [], singers: [], error: err.message }
    }
  })

  // ── 歌曲详情 ──
  ipcMain.handle('songs:detail', async (_e, songId: string) => {
    console.log('[songs:detail] id =', songId)
    try {
      const song = await gequhai.getSongDetail(songId)
      return { ok: true, song }
    } catch (err: any) {
      console.error('[songs:detail] ERR:', err.message)
      return { ok: false, song: null, error: err.message }
    }
  })

  // ── 导入歌曲 ──
  ipcMain.handle('songs:import', async (_e, payload: any) => {
    const { song, courseId, category } = payload ?? {}
    console.log('[songs:import]', song?.id, courseId, category)
    try {
      // 这里接你现有的导入逻辑
      return { ok: true }
    } catch (err: any) {
      console.error('[songs:import] ERR:', err.message)
      return { ok: false, error: err.message }
    }
  })
}