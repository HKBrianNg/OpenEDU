// 后台 API 客户端 —— 跑在主进程。
//
// 为什么不在渲染进程直接 fetch：
//   1. CORS。渲染进程是 file:// 页面，Origin 是 null，后台的跨域白名单放的是
//      pages.dev，直连会被挡。主进程是 Node，没有同源策略这一说。
//   2. 和工具里其它对外网络调用（生图 / 字幕 / 歌曲 / CDN purge）保持同一套路：
//      业务逻辑单独成文件（纯 Node，可以拿 node 直接测），main.cjs 只负责接到 IPC。

// 默认直连 worker 本尊。走 pages.dev 的代理层也行，但那是给浏览器用的，
// 桌面端没必要绕一道（worker 的 workers.dev 域名对 Node 出站没有封锁问题）。
const DEFAULT_API_BASE = 'https://openedu-worker.ngshunchiang.workers.dev';

// 安全底线：渲染进程只能传「意图」，不能传任意 URL。
// 这里限定只能调 /api/ 开头的接口，避免谁顺手改成去打别的站点。
function assertApiPath(p) {
  if (typeof p !== 'string' || !p.startsWith('/api/')) {
    throw new Error(`不允许的接口路径：${String(p)}`);
  }
}

/**
 * 发一个请求到后台，返回 { ok, status, data }（跟网页端 utils/request.ts 的形状一致，
 * 这样搬过来的 hook 几乎不用改）。
 */
async function request({ apiBase, token, method = 'GET', path, body, timeout = 15000 }) {
  const base = String(apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  assertApiPath(path);

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(base + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (e?.name === 'AbortError' || e?.name === 'TimeoutError') {
      throw new Error(`请求超时（${timeout}ms）`);
    }
    throw new Error(`连不上后台：${String(e?.cause?.code || e?.message || e)}`);
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/**
 * 登录换取 token。管理接口（/api/users、/api/admin/logs）都要带它。
 * 返回 { token, user }。
 */
async function login({ apiBase, email, password }) {
  if (!email || !password) throw new Error('请填邮箱和密码');

  const res = await request({
    apiBase,
    token: null,
    method: 'POST',
    path: '/api/auth/login',
    body: { email, password },
  });

  // token 位置以实际响应为准（历史上见过嵌套在 data 里的写法），多兜几处
  const token = res.data?.token ?? res.data?.data?.token ?? res.data?.accessToken;
  if (!res.ok || !token) {
    throw new Error(res.data?.message || `登录失败（HTTP ${res.status}）`);
  }

  return { token, user: res.data?.user ?? res.data?.data?.user ?? null };
}

module.exports = { DEFAULT_API_BASE, request, login };
