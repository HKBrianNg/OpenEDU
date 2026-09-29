// src/routes/registerRoutes.js
import { registerController } from '../controllers/registerController.js';

export async function registerRoutes(request, env, { url, lang }) {
  // 注册
  if (url.pathname === '/api/register' && request.method === 'POST') {
    const body = await request.json();
    return registerController({ env, lang, body });
  }

  return null;
}