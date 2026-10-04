// worker/src/routes/index.js

import { healthRoutes } from './healthRoutes.js';
import { dbTestRoutes } from './dbTestRoutes.js';
import { authRoutes } from './authRoutes.js';
import { registerRoutes } from './registerRoutes.js';
import { verifyEmailRoutes } from './verifyEmailRoutes.js';
import { userRoutes } from './userRoutes.js';
import { getMessage } from '../constants/messages.js';
import { preferencesRoutes } from './preferencesRoutes.js';
import { apiLog } from '../middleware/apiLog.js';

export async function router(request, env) {
  const url = new URL(request.url);
  const lang = request.headers.get('accept-language')?.split(',')[0] || 'zh-CN';

  // 创建 context 对象，包含 next 函数
  const context = {
    next: async () => {
      const routeHandlers = [
        healthRoutes,
        dbTestRoutes,
        authRoutes,
        registerRoutes,
        verifyEmailRoutes,
        userRoutes,
        preferencesRoutes,
      ];

      for (const handler of routeHandlers) {
        const result = await handler(request, env, { url, lang });
        if (result) return result;
      }

      return json({ code: 'NOT_FOUND', message: getMessage('NOT_FOUND', lang) }, 404);
    }
  };

  // 先经过日志中间件
  return apiLog(request, env, context);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}