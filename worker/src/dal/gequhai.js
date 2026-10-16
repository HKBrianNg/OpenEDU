// src/dal/gequhai.js
//
// gequhai.com（歌曲海）抓取封装，仅供 admin 后台「导入歌曲」使用。
//
// 站点机制（逆向自 /static/js/play.js）：
//   1. 反爬挑战：首次请求返回 403 + Set-Cookie，带着 cookie 再请求一次才返回 200
//   2. 音频直链：POST /api/music，body={id: play_id, type: mp3_type}，
//      头必须带 X-Requested-With: Http（字面量）且不能带 Origin，否则 403「访问异常」；
//      play_id 是会话级一次性 token，每次调用前要重新抓页面拿新的
//   3. LRC：歌词内联在页面 <div id="content-lrc2"> 里，<br /> 分隔，带 [mm:ss.xx] 时间戳
//
// 安全：目标域名固定为 gequhai.com，歌曲 id 只接受纯数字（避免 SSRF / 路径穿越）。

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BASE = 'https://www.gequhai.com';
const TIMEOUT_MS = 15_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 带超时的 fetch（Cloudflare Worker 没有默认超时，防第三方站挂起拖死请求） */
async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 两步 cookie 挑战：第一次拿 cookie（会 403），第二次带 cookie 才拿得到真页面。
 * @returns {Promise<{ html: string, cookie: string }>} cookie 需复用于同会话的 /api/music 调用
 */
async function fetchPage(url) {
  const first = await fetchWithTimeout(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
  });
  // Worker 的 Headers 支持 getSetCookie()（Node 18+/Workers 运行时）
  const jar =
    typeof first.headers.getSetCookie === 'function'
      ? first.headers.getSetCookie()
      : [first.headers.get('set-cookie')].filter(Boolean);
  const cookie = jar.map((c) => String(c).split(';')[0]).join('; ');
  // 第一次的响应体没用，但要读掉避免连接悬挂
  await first.text().catch(() => '');

  const second = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      ...(cookie ? { Cookie: cookie } : {}),
      Referer: BASE + '/',
    },
  });
  if (!second.ok) {
    throw new Error(`gequhai HTTP ${second.status}`);
  }
  return { html: await second.text(), cookie };
}

/**
 * POST /api/music 换音频直链。
 * 两个坑（实测）：
 *   1. X-Requested-With 必须是字面量 "Http"（不是 XMLHttpRequest），且不能带 Origin，
 *      否则返回 403「访问异常」
 *   2. play_id 一次性：每次调用都要重新抓页面拿新 token，用完即废
 * @returns {Promise<{ url: string, code: number|null, msg: string }>}
 */
async function fetchAudioUrl(playId, type, cookie, referer) {
  if (!playId) return { url: '', code: null, msg: 'no play_id' };

  const res = await fetchWithTimeout(`${BASE}/api/music`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'Http',
      'X-Custom-Header': 'Key',
      Referer: referer,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: `id=${encodeURIComponent(playId)}&type=${encodeURIComponent(type ?? 0)}`,
  });

  let payload = {};
  try {
    payload = await res.json();
  } catch {
    return { url: '', code: res.status, msg: 'bad json' };
  }

  if (payload?.code === 200 && payload?.data?.url) {
    return { url: payload.data.url, code: 200, msg: '' };
  }
  return { url: '', code: payload?.code ?? res.status, msg: payload?.msg || payload?.message || 'no url' };
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

const stripTags = (s) => decodeEntities(s.replace(/<[^>]+>/g, '')).trim();

/**
 * 解析搜索结果表格。每行结构：
 *   <tr>
 *     <td>1</td>
 *     <td><a href="/play/326" class="text-info font-weight-bold">晴天</a></td>
 *     <td>周杰伦</td>
 *   </tr>
 */
function parseSearchTable(html) {
  const results = [];
  const seen = new Set();

  // 按 <tr> 切块，逐块找 /play/<id> 链接 + 后面的歌手 <td>
  const blocks = html.split(/<tr[^>]*>/i);
  for (const block of blocks) {
    const link = block.match(/<a\s+href="\/play\/(\d+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;

    const id = link[1];
    if (seen.has(id)) continue;

    const title = stripTags(link[2]);
    if (!title) continue;

    // 歌手在 </a> 之后的第一个 <td> 里
    const after = block.slice(block.indexOf(link[0]) + link[0].length);
    const td = after.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    const artist = td ? stripTags(td[1]) : '';

    seen.add(id);
    results.push({ id, title, artist });
  }
  return results;
}

/**
 * 按歌手名搜索歌曲列表
 * @param {string} singer 歌手名（中文即可，内部做 URL 编码）
 * @returns {Promise<Array<{id:string,title:string,artist:string}>>}
 */
export async function searchSongs(singer) {
  const url = `${BASE}/search?s=${encodeURIComponent(singer)}`;
  const { html } = await fetchPage(url);
  return parseSearchTable(html);
}

/** 取页面里 window.<name> 的值（兼容字符串和裸数字两种写法） */
function pickVar(html, name) {
  const m = html.match(new RegExp(`window\\.${name}\\s*=\\s*(?:'([^']*)'|"([^"]*)"|(\\d+))`));
  if (!m) return '';
  return m[1] ?? m[2] ?? m[3] ?? '';
}

/** 抽出 <div id="content-lrc2"> 里的 LRC（<br /> 换行，带 [mm:ss.xx] 时间戳） */
function extractLrc(html) {
  const m = html.match(/<div[^>]*id="content-lrc2"[^>]*>([\s\S]*?)<\/div>/i);
  if (!m) return '';
  return decodeEntities(m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.length > 0)
    .join('\n');
}

/**
 * 取单曲详情（含 LRC 歌词 + 音频直链）
 * @param {string} id 站点歌曲 id（必须是纯数字，防路径注入）
 *
 * 注：音频直链是酷我 CDN 的带签名地址，有时效性，仅供后台试听预览，
 *     不要存进 data.json（长期有效需要自己转存文件）。
 */
export async function getSongDetail(id) {
  // 只接受数字 id，避免把任意字符串拼进 URL 造成 SSRF / 路径穿越
  const safeId = String(id ?? '').trim();
  if (!/^\d+$/.test(safeId)) {
    throw new Error('invalid song id');
  }

  const url = `${BASE}/play/${safeId}`;
  const { html, cookie } = await fetchPage(url);

  const lrc = extractLrc(html);

  // play_id 一次性：拿直链失败时重新抓页面换 token 重试
  let audio = await fetchAudioUrl(pickVar(html, 'play_id'), pickVar(html, 'mp3_type'), cookie, url);
  for (let attempt = 1; attempt < 3 && audio.code !== 200; attempt++) {
    await sleep(1500);
    try {
      const again = await fetchPage(url);
      audio = await fetchAudioUrl(
        pickVar(again.html, 'play_id'),
        pickVar(again.html, 'mp3_type'),
        again.cookie,
        url,
      );
    } catch {
      /* 重试失败就保留上一次的结果 */
    }
  }

  return {
    id: safeId,
    title: pickVar(html, 'mp3_title'),
    artist: pickVar(html, 'mp3_author'),
    cover: pickVar(html, 'mp3_cover'),
    lrc,
    // 去掉时间戳的纯歌词，便于在弹窗里快速扫一眼
    plainLyrics: lrc
      .split('\n')
      .map((l) => l.replace(/^\[\d{2}:\d{2}(?:\.\d{1,3})?\]\s*/, ''))
      .filter(Boolean)
      .join('\n'),
    audioUrl: audio.url,
    audioCode: audio.code,
    audioMsg: audio.msg,
  };
}
