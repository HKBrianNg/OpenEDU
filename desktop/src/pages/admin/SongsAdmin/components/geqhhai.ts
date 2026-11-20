// desktop/src/pages/admin/SongsAdmin/components/geqhhai.ts
// 站点机制见原注释。此版专注修音频直链 + 诊断。

const BASE = 'https://www.gequhai.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT_MS = 15000;

// ─── Electron IPC 类型声明（不 import 主进程文件）───
declare global {
  interface Window {
    electronAPI?: {
      resolveAudio: (
        playId: string,
        mp3Type: string,
        songId: string
      ) => Promise<{ url: string; code: number | null; msg: string }>
    }
  }
}

function decodeEntities(s: string): string {
  return String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(s: string): string {
  return decodeEntities(String(s ?? '').replace(/<[^>]+>/g, '')).trim();
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface PageResult {
  html: string;
  cookie: string;
}

async function fetchPage(url: string): Promise<PageResult> {
  const first = await fetchWithTimeout(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
  });
  const jar =
    typeof first.headers.getSetCookie === 'function'
      ? first.headers.getSetCookie()
      : [first.headers.get('set-cookie')].filter(Boolean);
  const cookie = jar.map((c) => String(c).split(';')[0]).join('; ');
  await first.text().catch(() => '');

  const second = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
  if (!second.ok) throw new Error(`gequhai HTTP ${second.status}`);
  return { html: await second.text(), cookie };
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
}

export function parseSearchTable(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  for (const block of String(html ?? '').split(/<tr[^>]*>/i)) {
    const link = block.match(/<a\s+href="\/play\/(\d+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const id = link[1];
    if (seen.has(id)) continue;
    const title = stripTags(link[2]);
    if (!title) continue;
    const after = block.slice(block.indexOf(link[0]) + link[0].length);
    const td = after.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    seen.add(id);
    results.push({ id, title, artist: td ? stripTags(td[1]) : '' });
  }
  return results;
}

function pickVar(html: string, name: string): string {
  const m = String(html ?? '').match(
    new RegExp(`window\\.${name}\\s*=\\s*(?:'([^']*)'|"([^"]*)"|(\\d+))`)
  );
  if (!m) return '';
  return m[1] ?? m[2] ?? m[3] ?? '';
}

export function extractLrc(html: string): string {
  const m = String(html ?? '').match(/<div[^>]*id="content-lrc2"[^>]*>([\s\S]*?)<\/div>/i);
  if (!m) return '';
  return decodeEntities(m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.length > 0)
    .join('\n');
}

export function plainLyrics(lrc: string): string {
  return String(lrc ?? '')
    .split('\n')
    .map((l) => l.replace(/^\[\d{2}:\d{2}(?:\.\d{1,3})?\]\s*/, ''))
    .filter(Boolean)
    .join('\n');
}

function extractAudioFromHtml(html: string): string {
  const m = html.match(/https?:\/\/[^"'\s<>]+\.(?:m4a|mp3)[^"'\s<>]*/i);
  return m ? m[0].replace(/&amp;/g, '&') : '';
}

// ─── 保留作为兜底，主路径已走 IPC ───
async function fetchAudioUrl(
  playId: string,
  type: string,
  cookie: string,
  pageHtml = ''
): Promise<{ url: string; code: number | null; msg: string }> {
  if (!playId) return { url: '', code: null, msg: 'no play_id' };

  console.log('[gequhai] fetchAudioUrl fallback playId=', playId, 'type=', type);
  const res = await fetchWithTimeout(`${BASE}/api/music`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: `id=${encodeURIComponent(playId)}&type=${encodeURIComponent(type ?? 0)}`,
  });

  const status = res.status;
  let payload: any = {};
  let raw = '';
  try {
    raw = await res.text();
    try { payload = JSON.parse(raw); } catch { /* ignore */ }
  } catch { /* ignore */ }

  const url =
    payload?.data?.url ||
    payload?.url ||
    payload?.data?.src ||
    payload?.src ||
    '';
  console.log('[gequhai] fetchAudioUrl resp status=', status, 'code=', payload?.code, 'hasUrl=', !!url);

  if (payload?.code === 200 && url) return { url, code: 200, msg: '' };
  const fallback = extractAudioFromHtml(pageHtml);
  if (fallback) return { url: fallback, code: 200, msg: 'html-fallback' };
  return { url: '', code: payload?.code ?? status, msg: payload?.msg || 'no url' };
}

export async function searchSongs(singer: string): Promise<SearchResult[]> {
  const q = String(singer ?? '').trim();
  if (!q) throw new Error('填个歌手名或歌名');
  const { html } = await fetchPage(`${BASE}/search?s=${encodeURIComponent(q)}`);
  return parseSearchTable(html);
}

export interface SongDetail {
  id: string;
  title: string;
  artist: string;
  cover: string;
  lrc: string;
  plainLyrics: string;
  audioUrl: string;
  audioCode: number | null;
  audioMsg: string;
}

export async function getSongDetail(id: string): Promise<SongDetail> {
  const safeId = String(id ?? '').trim()
  if (!/^\d+$/.test(safeId)) throw new Error('歌曲 id 不合法')

  const url = `${BASE}/play/${safeId}`
  const { html, cookie } = await fetchPage(url)
  const lrc = extractLrc(html)
  const playId = pickVar(html, 'play_id')
  const mp3Type = pickVar(html, 'mp3_type')
  console.log('[gequhai] detail', { safeId, playId, mp3Type, lrcLen: lrc.length })

  // ★ 主路径：IPC → 主进程隐藏窗口
  let audio: { url: string; code: number | null; msg: string }
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.resolveAudio) {
      const r = await window.electronAPI.resolveAudio(playId, mp3Type, safeId)
      audio = { url: r.url, code: r.code, msg: r.msg }
      // IPC 没拿到再退到 fetch 兜底
      if (!r.url) {
        console.warn('[gequhai] IPC empty, fallback fetchAudioUrl')
        audio = await fetchAudioUrl(playId, mp3Type, cookie, html)
      }
    } else {
      audio = await fetchAudioUrl(playId, mp3Type, cookie, html)
    }
  } catch (err: any) {
    console.error('[gequhai] resolveAudio failed:', err.message)
    audio = await fetchAudioUrl(playId, mp3Type, cookie, html)
  }

  console.log('[gequhai] audio result', {
    code: audio.code,
    hasUrl: !!audio.url,
    msg: audio.msg,
    urlPreview: audio.url.slice(0, 80),
  })

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
  }
}
function sniffAudioExt(buf: Buffer | Uint8Array): string | null {
  if (!buf || buf.length < 12) return null;
  const ascii = (a: number, b: number) => String.fromCharCode(...Array.from(buf.subarray(a, b)));
  if (ascii(0, 3) === 'ID3') return '.mp3';
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return '.mp3';
  if (ascii(4, 8) === 'ftyp') return '.m4a';
  if (ascii(0, 4) === 'OggS') return '.ogg';
  if (ascii(0, 4) === 'fLaC') return '.flac';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return '.wav';
  return null;
}

export async function downloadAudio(url: string): Promise<Buffer> {
  const u = String(url ?? '').trim();
  if (!/^https?:\/\//i.test(u)) throw new Error('音频地址不合法');
  const res = await fetchWithTimeout(u, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`音频下载失败 HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export default {
  searchSongs,
  getSongDetail,
  downloadAudio,
  sniffAudioExt,
  parseSearchTable,
  extractLrc,
  pickVar,
  plainLyrics,
};