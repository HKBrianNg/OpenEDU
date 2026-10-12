// client/src/utils/request.ts
// 统一的后台请求模块：
//  - 自动拼接 API_BASE（client/.env 的 VITE_API_BASE_URL）
//  - 自动携带 Authorization: Bearer <token>（取自 localStorage）
//  - 有 body 时自动加 Content-Type: application/json
//  - HTTP 响应返回 { ok, status, data }（data 为后台返回的完整 JSON）
//  - 网络错误（连不上服务器）会 throw，由调用方 catch 处理

// JSON 边界模块：解析后的响应体结构由各接口决定，此处使用 any 是务实选择
/* eslint-disable @typescript-eslint/no-explicit-any */

export const API_BASE: string = import.meta.env.VITE_API_BASE_URL || '';

export interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data: T; // 后台响应体（形如 { code, message, data } 等，由调用方自行取用）
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

// 401 全局处理白名单：这些公开接口本身就会返回 401（如密码错误），
// 不代表登录态过期，不做清 token / 登出
const PUBLIC_401_PATHS = [
  '/api/auth/login',
  '/api/register',
  '/api/check-email',
  '/api/check-nickname',
  '/api/verify-email',
];

// 登录态过期（带 token 请求收到 401）：
// 清掉本地凭据并广播事件，由 AuthContext 监听后重置全局状态，
// 路由守卫会自动把用户带回 /login
function handleAuthExpired(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent('auth:expired'));
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { token?: string | null },
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};

  const token = options?.token !== undefined ? options.token : getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 带着有效 token 却收到 401 → token 已过期/失效（公开接口除外）
  if (res.status === 401 && token && !PUBLIC_401_PATHS.some((p) => path.startsWith(p))) {
    handleAuthExpired();
  }

  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export const api = {
  get: <T = any>(path: string, options?: { token?: string | null }) =>
    request<T>('GET', path, undefined, options),

  post: <T = any>(path: string, body?: unknown, options?: { token?: string | null }) =>
    request<T>('POST', path, body, options),

  put: <T = any>(path: string, body?: unknown, options?: { token?: string | null }) =>
    request<T>('PUT', path, body, options),

  patch: <T = any>(path: string, body?: unknown, options?: { token?: string | null }) =>
    request<T>('PATCH', path, body, options),

  delete: <T = any>(path: string, body?: unknown, options?: { token?: string | null }) =>
    request<T>('DELETE', path, body, options),
};
