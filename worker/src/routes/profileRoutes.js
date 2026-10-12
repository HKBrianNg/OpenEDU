// src/routes/profileRoutes.js
// 用户自助资料路由（登录即可，不限角色）
import { requireAuth } from '../middleware/auth.js';
import { updateProfileController, changePasswordController } from '../controllers/profileController.js';

export async function profileRoutes(request, env, { url, lang }) {
  // 修改自己的昵称
  if (url.pathname === '/api/profile' && request.method === 'PATCH') {
    const auth = await requireAuth(request, env, { lang });
    if (!auth.user) return auth;
    const body = await request.json().catch(() => ({}));
    return updateProfileController({ env, lang, authUser: auth.user, body });
  }

  // 修改自己的密码
  if (url.pathname === '/api/profile/password' && request.method === 'PUT') {
    const auth = await requireAuth(request, env, { lang });
    if (!auth.user) return auth;
    const body = await request.json().catch(() => ({}));
    return changePasswordController({ env, lang, authUser: auth.user, body });
  }

  return null;
}
