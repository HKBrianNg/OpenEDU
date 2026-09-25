// src/middleware/logger.js
import { logger } from '../utils/logger.js';

export function loggerMiddleware(request) {
  const url = new URL(request.url);
  logger.info(`${request.method} ${url.pathname}`, {
    ip: request.headers.get('cf-connecting-ip') || '',
    userAgent: request.headers.get('user-agent') || '',
  });
}