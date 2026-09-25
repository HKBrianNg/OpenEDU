// src/routes/healthRoutes.js
import { healthController } from '../controllers/healthController.js';

export async function healthRoutes(request, env, { url, lang }) {
  if (url.pathname === '/api/health' && request.method === 'GET') {
    return healthController({ lang });
  }
  return null; // 不匹配就返回 null，讓下一個路由試
}