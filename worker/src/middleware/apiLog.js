// worker/src/middleware/apiLog.js

import { logger } from '../utils/logger.js';
import { storeLog } from '../store/logStore.js';

// 安全序列化（避免敏感字段）
function safeJson(data) {
  if (data === undefined || data === null) return null;
  
  try {
    const sanitized = JSON.parse(JSON.stringify(data));
    if (sanitized && typeof sanitized === 'object') {
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.authorization;
      delete sanitized.cookie;
    }
    return sanitized;
  } catch (e) {
    return String(data);
  }
}

export async function apiLog(request, env, context) {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  
  // 读取请求体（需要 clone，因为 body 只能读一次）
  let reqBody = null;
  if (request.body) {
    try {
      const cloned = request.clone();
      reqBody = safeJson(await cloned.json());
    } catch (e) {
      reqBody = null;
    }
  }

  // 记录请求
  const log = {
    id: requestId,
    time: new Date().toISOString(),
    method: request.method,
    url: url.pathname + url.search,
    requestHeaders: safeJson(Object.fromEntries(request.headers)),
    requestBody: reqBody,
    ip: request.headers.get('cf-connecting-ip') || '',
  };

  // 在 router 处理完成后记录响应
  const originalResponse = await context.next();
  
  // 读取响应体
  let resBody = null;
  try {
    const cloned = originalResponse.clone();
    resBody = safeJson(await cloned.json());
  } catch (e) {
    resBody = null;
  }

  // 补全日志
  log.status = originalResponse.status;
  log.responseBody = resBody;
  log.durationMs = Date.now() - start;

  // 存储日志（供 /api/admin/logs 查询）
  storeLog(log);

  // 输出日志（写入 Cloudflare 日志系统）
  logger.info(`${log.method} ${log.url} ${log.status} ${log.durationMs}ms`, log);

  return originalResponse;
}