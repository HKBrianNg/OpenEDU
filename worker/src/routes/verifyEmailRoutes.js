// src/routes/verifyEmailRoutes.js
import { verifyEmailController } from '../controllers/verifyEmailController.js';

export async function verifyEmailRoutes(request, env, { url, lang }) {
  // 验证邮箱（GET 请求，用户点击邮件链接）
  if (url.pathname === '/api/verify-email' && request.method === 'GET') {
    const token = url.searchParams.get('token');
    return verifyEmailController({ env, lang, token });
  }

  return null;
}