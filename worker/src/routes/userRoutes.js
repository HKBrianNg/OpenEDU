// src/routes/userRoutes.js
import { requireRole } from '../middleware/auth.js';
import { 
  listUsersController, 
  getUserController,
  updateUserController,
  updateUserStatusController,
  deleteUserController,
  checkEmailController, 
  checkNicknameController 
} from '../controllers/userController.js';

export async function userRoutes(request, env, { url, lang }) {
  // 用户列表（仅 admin）
  if (url.pathname === '/api/users' && request.method === 'GET') {
    const auth = await requireRole('admin')(request, env, { lang });
    if (auth.user) {
      return listUsersController({ env, lang });
    }
    return auth;
  }

  // 获取单个用户（仅 admin，编辑时回填）
  if (url.pathname.startsWith('/api/users/') && request.method === 'GET') {
    const auth = await requireRole('admin')(request, env, { lang });
    if (auth.user) {
      const id = url.pathname.split('/').pop();
      return getUserController({ env, lang, params: { id } });
    }
    return auth;
  }

  // 更新用户资料（仅 admin：email / nickname / role / status）
  if (url.pathname.startsWith('/api/users/') && request.method === 'PUT') {
    const auth = await requireRole('admin')(request, env, { lang });
    if (auth.user) {
      const id = url.pathname.split('/').pop();
      const body = await request.json().catch(() => ({}));
      return updateUserController({ env, lang, params: { id }, body });
    }
    return auth;
  }

  // 更新用户状态（仅 admin，快捷操作：active / disabled / pending）
  if (url.pathname.startsWith('/api/users/') && request.method === 'PATCH') {
    const auth = await requireRole('admin')(request, env, { lang });
    if (auth.user) {
      const id = url.pathname.split('/').pop();
      const body = await request.json().catch(() => ({}));
      return updateUserStatusController({ env, lang, params: { id }, body });
    }
    return auth;
  }

  // 删除用户（仅 admin，物理删除）
  if (url.pathname.startsWith('/api/users/') && request.method === 'DELETE') {
    const auth = await requireRole('admin')(request, env, { lang });
    if (auth.user) {
      const id = url.pathname.split('/').pop();
      return deleteUserController({ env, lang, params: { id } });
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