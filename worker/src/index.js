// src/index.js
import { router } from './routes/index.js';
import { corsMiddleware } from './middleware/cors.js';
import { loggerMiddleware } from './middleware/logger.js';

export default {
  async fetch(request, env) {
    // 1. CORS 預檢
    const corsResponse = corsMiddleware(request, env);
    if (corsResponse) return corsResponse;

    // 2. 日誌
    loggerMiddleware(request);

    // 3. 轉發給 router
    return router(request, env);
  },
};