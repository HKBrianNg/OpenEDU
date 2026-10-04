// worker/src/routes/logRoutes.js
import { LOG_STORE } from '../store/logStore.js';
import { json } from './index.js'; // 复用 index 的 json（或自行 new Response）

export async function logRoutes(request, env, { url, lang }) {
  // GET /api/admin/logs
  if (url.pathname === '/api/admin/logs' && request.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit')) || 200;
    let logs = Array.from(LOG_STORE.values()).slice(-limit).reverse();
    return json({ logs });
  }
  // GET /api/admin/logs/:id
  const match = url.pathname.match(/^\/api\/admin\/logs\/(.+)$/);
  if (match && request.method === 'GET') {
    const log = LOG_STORE.get(match[1]);
    if (log) return json(log);
    return json({ message: 'Not Found' }, 404);
  }
  return null;
}