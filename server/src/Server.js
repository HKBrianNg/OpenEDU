// worker.js
import { getMessage } from './src/constants/messages.js';
import { logger } from './src/utils/logger.js';

export default {
  async fetch(request, env) {
    // 1. CORS 預檢
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': env.FRONTEND_URL || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const lang = request.headers.get('accept-language')?.split(',')[0] || 'zh-CN';

    // 2. 請求日誌（用你的 logger）
    logger.info(`${request.method} ${url.pathname}`, {
      ip: request.headers.get('cf-connecting-ip') || '',
      userAgent: request.headers.get('user-agent') || '',
    });

    try {
      // 3. 健康檢查
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return json({ status: 'ok', timestamp: new Date().toISOString() });
      }

      // ========== 你的業務路由 ==========

      // 範例：查用戶列表
      if (url.pathname === '/api/users' && request.method === 'GET') {
        logger.info('Fetching users list');
        const data = await supabaseFetch(env, '/rest/v1/users?select=*', 'GET');
        return json({ message: getMessage('USERS_LIST_RETRIEVED', lang), data });
      }

      // 範例：新增用戶
      if (url.pathname === '/api/users' && request.method === 'POST') {
        const body = await request.json();
        logger.info('Creating user', { email: body.email });
        const data = await supabaseFetch(env, '/rest/v1/users', 'POST', body);
        return json({ message: getMessage('REGISTER_SUCCESS', lang), data }, 201);
      }

      // 範例：更新用戶
      const match = url.pathname.match(/^\/api\/users\/(\d+)$/);
      if (match && request.method === 'PATCH') {
        const id = match[1];
        const body = await request.json();
        logger.info(`Updating user ${id}`, body);
        const data = await supabaseFetch(env, `/rest/v1/users?id=eq.${id}`, 'PATCH', body);
        return json({ message: getMessage('USER_STATUS_UPDATED', lang), data });
      }

      // ========== 路由結束 ==========

      // 4. 404
      logger.warn(`404 Not Found: ${request.method} ${url.pathname}`);
      return json({ code: 'NOT_FOUND', message: getMessage('NOT_FOUND', lang) }, 404);

    } catch (err) {
      // 5. 全局錯誤處理
      logger.error('Unhandled error:', err);
      return json({ code: 'INTERNAL_ERROR', message: getMessage('INTERNAL_ERROR', lang) }, 500);
    }
  },
};

// ========== Supabase REST 封裝（不用 client SDK） ==========
async function supabaseFetch(env, path, method = 'GET', body = null) {
  const url = `${env.SUPABASE_URL}${path}`;
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const errorText = await res.text();
    logger.error(`Supabase ${method} ${path} failed:`, res.status, errorText);
    throw new Error(`Supabase ${method} ${path} failed: ${res.status} ${errorText}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ========== 統一 JSON 響應 ==========
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}