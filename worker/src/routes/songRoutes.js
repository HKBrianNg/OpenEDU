// src/routes/songRoutes.js
import { requireRole } from '../middleware/auth.js';
import { getSongDataController, saveSongDataController } from '../controllers/songController.js';

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

  return null;
}
