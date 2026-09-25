// src/routes/index.js
import { healthRoutes } from './healthRoutes.js';
import { getMessage } from '../constants/messages.js';

export async function router(request, env) {
  const url = new URL(request.url);
  const lang = request.headers.get('accept-language')?.split(',')[0] || 'zh-CN';

  // 目前只有 healthRoutes，之後再加 authRoutes、userRoutes
  const routeHandlers = [
    healthRoutes,
  ];

  for (const handler of routeHandlers) {
    const result = await handler(request, env, { url, lang });
    if (result) return result;
  }

  // 404
  return json({ code: 'NOT_FOUND', message: getMessage('NOT_FOUND', lang) }, 404);
}

// 共用 JSON 響應
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}