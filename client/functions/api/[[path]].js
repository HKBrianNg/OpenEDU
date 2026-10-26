/**
 * 把同源的 /api/* 请求转发到真正的后台 Worker。
 *
 * 为什么要这一层：后台跑在 https://openedu-worker.<sub>.workers.dev，
 * 而 *.workers.dev 这个默认域名在部分地区直连不上（前台用的 *.pages.dev 却可以）。
 * 加这一层之后：
 *
 *   浏览器 → https://<你的 Pages>.pages.dev/api/login   ← 同源，浏览器只碰这一个域名
 *                ↓ Cloudflare 内侧转发（不经过访问者的网络）
 *           https://openedu-worker.<sub>.workers.dev/api/login
 *
 * 于是访问者不再需要 VPN。转发发生在 Cloudflare 内部才算数 ——
 * 如果只是在浏览器前端换个地址，那条请求还是得从访问者的网络出去，等于没改。
 *
 * 顺带的好处：请求对浏览器来说是同源调用，所以后台的 CORS 白名单
 * （FRONTEND_URL 里那个写死的 pages.dev 地址）配得对不对都不再影响能不能连上。
 */

// 默认后台地址。想换后台（比如以后有了自己的域名）不用改代码：
// 在 Cloudflare → Pages 项目 → Settings → Environment variables 里加一个
// BACKEND_ORIGIN，部署后会自动到这里来取。
const DEFAULT_BACKEND = 'https://openedu-worker.ngshunchiang.workers.dev';

export async function onRequest({ request, env }) {
  const url = new URL(request.url);

  // 只用pathname，不碰 query：查询参数要原样带给后台（比如 /api/xxx?page=2）
  const target = `${env.BACKEND_ORIGIN || DEFAULT_BACKEND}${url.pathname}${url.search}`;

  // Host 要删掉：带着 pages.dev 的 Host 去请求 workers.dev，
  // 某些 CDN/网关会因此拒内容（Host 不匹配）
  const headers = new Headers(request.headers);
  headers.delete('host');

  try {
    const res = await fetch(target, {
      method: request.method,
      headers,
      // GET/HEAD 没有 body；带了反而会让 fetch 报错
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      // 让 3xx 原样回到浏览器，别在这里就自动跟过去
      redirect: 'manual',
    });

    // Content-Encoding / Content-Length 照抄的话，
    // 遇到 gzip 响应会因长度对不上而挂掉 —— 这两个丢给运行环境去算
    const out = new Headers(res.headers);
    out.delete('content-encoding');
    out.delete('content-length');

    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, message: `后台转发失败：${err.message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
