// src/routes/preferencesRoutes.js
import { requireAuth } from '../middleware/auth.js';
import {
  getPreferencesController,
  updatePreferencesController,
} from '../controllers/preferencesController.js';

export async function preferencesRoutes(request, env, { url, lang }) {
  // 所有偏好接口都需要登录
  if (url.pathname === '/api/preferences') {
    const auth = await requireAuth(request, env, { lang });

    // 未登录
    if (!auth.user) {
      return auth;
    }

    // GET - 获取偏好
    if (request.method === 'GET') {
      return getPreferencesController({ env, lang, user: auth.user });
    }

    // PATCH - 更新偏好
    if (request.method === 'PATCH') {
      const body = await request.json().catch(() => ({}));
      return updatePreferencesController({ env, lang, user: auth.user, body });
    }
  }

  return null;
}