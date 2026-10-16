// src/routes/songRoutes.js
import { requireRole } from '../middleware/auth.js';
import { getSongDataController, saveSongDataController } from '../controllers/songController.js';
import {
  searchGequhaiController,
  getGequhaiSongController,
} from '../controllers/songImportController.js';

export async function songRoutes(request, env, { url, lang }) {
  // 获取课程歌曲目录（仅 admin）
  if (url.pathname === '/api/admin/songs' && request.method === 'GET') {
    const auth = await requireRole('admin')(request, env, { lang });
    if (auth.user) {
      const courseId = url.searchParams.get('courseId');
      return getSongDataController({ env, lang, query: { courseId } });
    }
    return auth;
  }

  // 保存课程歌曲目录（仅 admin，整份 upsert）
  if (url.pathname === '/api/admin/songs' && request.method === 'PUT') {
    const auth = await requireRole('admin')(request, env, { lang });
    if (auth.user) {
      const body = await request.json().catch(() => ({}));
      return saveSongDataController({ env, lang, body });
    }
    return auth;
  }

  // 从 gequhai.com 按歌手名搜索歌曲（仅 admin，worker 代抓以绕过 CORS/cookie 挑战）
  if (url.pathname === '/api/admin/songs/gequhai-search' && request.method === 'GET') {
    const auth = await requireRole('admin')(request, env, { lang });
    if (auth.user) {
      const singer = url.searchParams.get('singer');
      return searchGequhaiController({ lang, query: { singer } });
    }
    return auth;
  }

  // 从 gequhai.com 取单曲详情（含 LRC 歌词，仅 admin）
  if (url.pathname === '/api/admin/songs/gequhai-song' && request.method === 'GET') {
    const auth = await requireRole('admin')(request, env, { lang });
    if (auth.user) {
      const id = url.searchParams.get('id');
      return getGequhaiSongController({ lang, query: { id } });
    }
    return auth;
  }

  return null;
}
