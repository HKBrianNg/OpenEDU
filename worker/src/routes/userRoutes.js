// src/routes/userRoutes.js
import { requireRole } from '../middleware/auth.js';
import { listUsersController, checkEmailController, checkNicknameController } from '../controllers/userController.js';

export async function userRoutes(request, env, { url, lang }) {
  // 用户列表（仅 admin）
  if (url.pathname === '/api/users' && request.method === 'GET') {
    const auth = await requireRole('admin')(request, env, { lang });
    if (auth.user) {
      return listUsersController({ env, lang });
    }
    return auth;
  }

  // 邮箱预检（公开，无需登录）
  if (url.pathname === '/api/check-email' && request.method === 'GET') {
    const email = url.searchParams.get('email')?.toLowerCase();
    return checkEmailController({ env, lang, query: { email } });
  }

  // 昵称预检（公开，无需登录）
  if (url.pathname === '/api/check-nickname' && request.method === 'GET') {
    const nickname = url.searchParams.get('nickname')?.trim();
    return checkNicknameController({ env, lang, query: { nickname } });
  }

  return null;
}