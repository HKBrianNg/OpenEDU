// src/routes/learningProgressRoutes.js
import { requireAuth } from '../middleware/auth.js';
import {
  handleGetUserProgress,
  handleGetChapterProgress,
  handleGetGroupProgress,
  handleGetWordProgress,
  handleUpsertWordProgress,
  handleDeleteWordProgress,
  handleGetProgressStats,
} from '../controllers/learningProgressController.js';

export async function learningProgressRoutes(request, env, { url, lang }) {
  // 获取用户所有学习进度
  if (url.pathname === '/api/progress' && request.method === 'GET') {
    const auth = await requireAuth(request, env, { lang });
    if (auth.user) {
      const userId = url.searchParams.get('userId');
      return handleGetUserProgress({ env, lang, query: { userId } });
    }
    return auth;
  }

  // 获取章节学习进度
  if (url.pathname === '/api/progress/chapter' && request.method === 'GET') {
    const auth = await requireAuth(request, env, { lang });
    if (auth.user) {
      const userId = url.searchParams.get('userId');
      const chapterName = url.searchParams.get('chapterName');
      return handleGetChapterProgress({ env, lang, query: { userId, chapterName } });
    }
    return auth;
  }

  // 获取分组学习进度
  if (url.pathname === '/api/progress/group' && request.method === 'GET') {
    const auth = await requireAuth(request, env, { lang });
    if (auth.user) {
      const userId = url.searchParams.get('userId');
      const chapterName = url.searchParams.get('chapterName');
      const groupName = url.searchParams.get('groupName');
      return handleGetGroupProgress({ env, lang, query: { userId, chapterName, groupName } });
    }
    return auth;
  }

  // 获取单个单词学习状态
  if (url.pathname === '/api/progress/word' && request.method === 'GET') {
    const auth = await requireAuth(request, env, { lang });
    if (auth.user) {
      const userId = url.searchParams.get('userId');
      const chapterName = url.searchParams.get('chapterName');
      const groupName = url.searchParams.get('groupName');
      const contentEn = url.searchParams.get('contentEn');
      return handleGetWordProgress({ env, lang, query: { userId, chapterName, groupName, contentEn } });
    }
    return auth;
  }

  // 更新单词状态（learning / mastered）
  if (url.pathname === '/api/progress' && request.method === 'POST') {
    const auth = await requireAuth(request, env, { lang });
    if (auth.user) {
      const body = await request.json().catch(() => ({}));
      return handleUpsertWordProgress({ env, lang, body });
    }
    return auth;
  }

  // 删除单词进度（回到 pending）
  if (url.pathname === '/api/progress' && request.method === 'DELETE') {
    const auth = await requireAuth(request, env, { lang });
    if (auth.user) {
      const userId = url.searchParams.get('userId');
      const body = await request.json().catch(() => ({}));
      return handleDeleteWordProgress({ env, lang, query: { userId }, body });
    }
    return auth;
  }

  // 获取学习统计
  if (url.pathname === '/api/progress/stats' && request.method === 'GET') {
    const auth = await requireAuth(request, env, { lang });
    if (auth.user) {
      const userId = url.searchParams.get('userId');
      return handleGetProgressStats({ env, lang, query: { userId } });
    }
    return auth;
  }

  return null;
}