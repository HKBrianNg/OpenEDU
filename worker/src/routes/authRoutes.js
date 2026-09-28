// src/routes/authRoutes.js
import { loginController } from '../controllers/authController.js';

export async function authRoutes(request, env, { url, lang }) {
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    return loginController({ env, lang, body });
  }
  return null;
}