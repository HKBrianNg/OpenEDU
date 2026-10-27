// tools/src/renderer/admin/apiClient.js
// 后台请求的「渲染进程侧」。
//
// 真正的 HTTP 在主进程做（tools/electron/api.cjs）× 走 IPC 过来，
// 这样绕开了 file:// 页面的同源限制 —— 后台的跨域白名单放的是 pages.dev，
// 渲染进程直接 fetch 会被 CORS 挡掉。
//
// 接口形状刻意做成跟网页端 client/src/utils/request.ts 一模一样
// （get/post/put/patch/delete → { ok, status, data }），
// 所以搬过来的 hook 几乎一个字都不用改。

async function call(method, path, body) {
  if (!window.api?.apiRequest) {
    throw new Error('主进程桥未就绪（window.api.apiRequest 不存在）');
  }
  // window.api.apiRequest 过 guard，回来是信封；真正的响应形状在 data 里
  const env = await window.api.apiRequest({ method, path, body });
  if (!env?.ok) {
    throw new Error(env?.error || '后台请求失败');
  }
  const res = env.data;
  // 登录态过期：只派个事件，由 SessionContext 决定退到登录页。
  // 这里不认识 React，保持解耦（网页端那套是 AuthContext 监听 auth:expired 事件）
  if (res?.status === 401) {
    window.dispatchEvent(new CustomEvent('api:unauthorized'));
  }
  return res;
}

export const api = {
  get: (path) => call('GET', path),
  post: (path, body) => call('POST', path, body),
  put: (path, body) => call('PUT', path, body),
  patch: (path, body) => call('PATCH', path, body),
  delete: (path, body) => call('DELETE', path, body),
};

// 登录 / 退出 / 改设置不在放这里：那几个能力只有一个使用者 SessionContext，
// 而且它们要经过 guard 的信封（{ ok, data }），混在这里容易又被当成裸返回值。
