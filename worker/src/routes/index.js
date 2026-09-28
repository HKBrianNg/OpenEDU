import { healthRoutes } from './healthRoutes.js';
import { dbTestRoutes } from './dbTestRoutes.js';
import { authRoutes } from './authRoutes.js';
import { userRoutes } from './userRoutes.js';
import { getMessage } from '../constants/messages.js';
import { preferencesRoutes } from './preferencesRoutes.js';

export async function router(request, env) {
  const url = new URL(request.url);
  const lang = request.headers.get('accept-language')?.split(',')[0] || 'zh-CN';

  const routeHandlers = [
    healthRoutes,
    dbTestRoutes,
    authRoutes,
    userRoutes,
    preferencesRoutes,
  ];

  for (const handler of routeHandlers) {
    const result = await handler(request, env, { url, lang });
    if (result) return result;
  }

  return json({ code: 'NOT_FOUND', message: getMessage('NOT_FOUND', lang) }, 404);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}