// src/middleware/cors.js

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';

/**
 * 解析本次请求允许的 Origin（动态回显，而不是写死 FRONTEND_URL）：
 * 1) 与 FRONTEND_URL 完全一致（生产环境）
 * 2) FRONTEND_URL 的子域名 —— 覆盖 Cloudflare Pages 预览部署的随机前缀
 *    （如 https://b84312c5.openedu-client.pages.dev）
 * 3) 本地开发（localhost / 127.0.0.1 任意端口）
 *
 * 返回值作为 Access-Control-Allow-Origin；返回 null 表示不允许（不下发该头）。
 * 注意：浏览器要求该值与请求 Origin 严格相等，所以必须原样回显（含端口、不含尾部斜杠）。
 */
export function resolveAllowedOrigin(request, env) {
  const origin = (request.headers.get('Origin') || '').replace(/\/+$/, '');
  if (!origin) return null;

  const frontendUrl = (env.FRONTEND_URL || '').replace(/\/+$/, '');

  // 未配置 FRONTEND_URL 时保持旧行为：放开
  if (!frontendUrl) return origin || '*';

  if (origin === frontendUrl) return origin;

  // 配置域名的所有子域名（Pages 预览部署等）
  try {
    const frontendHost = new URL(frontendUrl).hostname;
    const originHost = new URL(origin).hostname;
    if (originHost === frontendHost || originHost.endsWith(`.${frontendHost}`)) {
      return origin;
    }
  } catch {
    // FRONTEND_URL 或 Origin 非法，忽略继续
  }

  // 本地开发
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return origin;
  }

  return null;
}

function buildCorsHeaders(request, env) {
  const headers = {
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
    // Origin 动态回显时必须带 Vary，防止 CDN/浏览器缓存串源
    Vary: 'Origin',
  };
  const origin = resolveAllowedOrigin(request, env);
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

// 處理 OPTIONS 預檢
export function corsMiddleware(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: buildCorsHeaders(request, env) });
  }
  return null;
}

// 給業務響應注入 CORS 頭
export function addCorsHeaders(response, env, request) {
  const newHeaders = new Headers(response.headers);
  const corsHeaders = buildCorsHeaders(request, env);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
