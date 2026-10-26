// gequhai.com（歌曲海）抓取 —— 桌面端的「从网上导入歌曲」
//
// 网上那套为什么要走 Worker：浏览器直连会被 CORS + 站方的 cookie 挑战挡住。
// 桌面端在主进程里发请求，没有 CORS 这一说，能直连。这是桌面端的优势之一。
//
// 站点机制（逆向自 /static/js/play.js，原逻辑见 worker/src/dal/gequhai.js）：
//   1. 反爬挑战：首次请求 403 + Set-Cookie，带着 cookie 再请求一次才返回 200
//   2. 音频直链：POST /api/music，body={id: play_id, type: mp3_type}，
//      头必须带 X-Requested-With: Http（字面量！不是 XMLHttpRequest）
//      且不能带 Origin，否则 403「访问异常」
//      play_id 是会话级一次性 token，每次调用前要重新抓页面拿新的
//   3. LRC：内联在 <div id="content-lrc2"> 里，<br /> 分隔，带 [mm:ss.xx] 时间戳
//   4. 下载音频：酷我 CDN 拒绝 gequhai 的 Referer —— 只带 UA，绝不带 Referer
//
// 安全：域名固定 gequhai.com；歌曲 id 只接受纯数字（防 SSRF / 路径穿越）。

const BASE = 'https://www.gequhai.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT_MS = 15000;

function decodeEntities(s) {
  return String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

const stripTags = (s) => decodeEntities(String(s ?? '').replace(/<[^>]+>/g, '')).trim();

/** 带超时的 fetch：第三方站挂起不能拖死界面 */
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
 * 两步 cookie 挑战。第一次拿 cookie（会 403），第二次带 cookie 才是真页面。
 * @returns {{ html: string, cookie: string }}
 */
async function fetchPage(url) {
  const first = await fetchWithTimeout(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
  });
  const jar =
    typeof first.headers.getSetCookie === 'function'
      ? first.headers.getSetCookie()
      : [first.headers.get('set-cookie')].filter(Boolean);
  const cookie = jar.map((c) => String(c).split(';')[0]).join('; ');
  // 第一次的响应体没用，但要读掉，免得连接悬挂
  await first.text().catch(() => '');

  const second = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      ...(cookie ? { Cookie: cookie } : {}),
      Referer: BASE + '/',
    },
  });
  if (!second.ok) throw new Error(`gequhai HTTP ${second.status}`);
  return { html: await second.text(), cookie };
}

/**
 * 解析搜索结果表格：
 *   <tr><td>1</td><td><a href="/play/326">晴天</a></td><td>周杰伦</td></tr>
 */
function parseSearchTable(html) {
  const results = [];
  const seen = new Set();

  for (const block of String(html ?? '').split(/<tr[^>]*>/i)) {
    const link = block.match(/<a\s+href="\/play\/(\d+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;

    const id = link[1];
    if (seen.has(id)) continue;
    const title = stripTags(link[2]);
    if (!title) continue;

    // 歌手在 </a> 之后的第一个 <td> 里
    const after = block.slice(block.indexOf(link[0]) + link[0].length);
    const td = after.match(/<td[^>]*>([\s\S]*?)<\/td>/i);

    seen.add(id);
    results.push({ id, title, artist: td ? stripTags(td[1]) : '' });
  }
  return results;
}

/** 取页面里 window.<name> 的值（兼容字符串和裸数字两种写法） */
function pickVar(html, name) {
  const m = String(html ?? '').match(
    new RegExp(`window\\.${name}\\s*=\\s*(?:'([^']*)'|"([^"]*)"|(\\d+))`)
  );
  if (!m) return '';
  return m[1] ?? m[2] ?? m[3] ?? '';
}

/** 抽出 <div id="content-lrc2"> 里的 LRC */
function extractLrc(html) {
  const m = String(html ?? '').match(/<div[^>]*id="content-lrc2"[^>]*>([\s\S]*?)<\/div>/i);
  if (!m) return '';
  return decodeEntities(m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.length > 0)
    .join('\n');
}

/** 去掉时间戳的纯歌词，用来在界面上快速扫一眼 */
function plainLyrics(lrc) {
  return String(lrc ?? '')
    .split('\n')
    .map((l) => l.replace(/^\[\d{2}:\d{2}(?:\.\d{1,3})?\]\s*/, ''))
    .filter(Boolean)
    .join('\n');
}

/** POST /api/music 换音频直链（play_id 一次性，失败要重新抓页面换 token） */
async function fetchAudioUrl(playId, type, cookie, referer) {
  if (!playId) return { url: '', code: null, msg: 'no play_id' };

  const res = await fetchWithTimeout(`${BASE}/api/music`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'Http', // 字面量，写错就 403
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
  return {
    url: '',
    code: payload?.code ?? res.status,
    msg: payload?.msg || payload?.message || 'no url',
  };
}

/** 按歌手名搜索歌曲 */
async function searchSongs(singer) {
  const q = String(singer ?? '').trim();
  if (!q) throw new Error('填个歌手名或歌名');
  const { html } = await fetchPage(`${BASE}/search?s=${encodeURIComponent(q)}`);
  return parseSearchTable(html);
}

/** 取单曲详情（LRC + 音频直链） */
async function getSongDetail(id) {
  // 只接受数字 id：拼进 URL 的字符串必须可控，防 SSRF / 路径穿越
  const safeId = String(id ?? '').trim();
  if (!/^\d+$/.test(safeId)) throw new Error('歌曲 id 不合法');

  const url = `${BASE}/play/${safeId}`;
  const { html, cookie } = await fetchPage(url);
  const lrc = extractLrc(html);

  let audio = await fetchAudioUrl(
    pickVar(html, 'play_id'),
    pickVar(html, 'mp3_type'),
    cookie,
    url
  );
  // play_id 一次性：拿直链失败就重新抓页面换 token 再试
  for (let attempt = 1; attempt < 3 && audio.code !== 200; attempt++) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const again = await fetchPage(url);
      audio = await fetchAudioUrl(
        pickVar(again.html, 'play_id'),
        pickVar(again.html, 'mp3_type'),
        again.cookie,
        url
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
    plainLyrics: plainLyrics(lrc),
    audioUrl: audio.url,
    audioCode: audio.code,
    audioMsg: audio.msg,
  };
}

/**
 * 按文件头判断真实音频格式 —— 直链后缀不一定可信，
 * 存错扩展名前台会加载失败。
 */
function sniffAudioExt(buf) {
  if (!buf || buf.length < 12) return null;
  const ascii = (a, b) => buf.subarray(a, b).toString('ascii');
  if (ascii(0, 3) === 'ID3') return '.mp3';
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return '.mp3';
  if (ascii(4, 8) === 'ftyp') return '.m4a';
  if (ascii(0, 4) === 'OggS') return '.ogg';
  if (ascii(0, 4) === 'fLaC') return '.flac';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return '.wav';
  return null;
}

/** 下音频。酷我 CDN 拒绝 gequhai 的 Referer —— 只带 UA，绝不带 Referer */
async function downloadAudio(url) {
  const u = String(url ?? '').trim();
  if (!/^https?:\/\//i.test(u)) throw new Error('音频地址不合法');

  const res = await fetchWithTimeout(u, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`音频下载失败 HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

module.exports = {
  searchSongs,
  getSongDetail,
  downloadAudio,
  sniffAudioExt,
  // 这几个是纯函数，单独导出来给测试用（不用联网也能测）
  parseSearchTable,
  extractLrc,
  pickVar,
  plainLyrics,
};
