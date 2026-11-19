// desktop/electron/lib/gequhai.ts

// ─── 类型导出（给前端 / 主进程共用） ───

export interface GequhaiSong {
  id: string | number
  title: string
  artist: string
}

export interface GequhaiDetail {
  id: string | number
  title: string
  artist: string
  cover: string
  lrc: string
  plainLyrics: string
  audioUrl: string
  audioCode: number
  audioMsg: string
}

// ─── 常量 ───

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const BASE = 'https://www.gequhai.com'

// ─── 工具 ───

const decodeEntities = (s: string): string =>
  String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

const stripTags = (s: string): string =>
  decodeEntities(String(s ?? '').replace(/<[^>]+>/g, '')).trim()

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** 两步 cookie 挑战：首次 403 拿 cookie，第二次带 cookie 拿真页面 */
async function fetchPage(url: string): Promise<{ html: string; cookie: string }> {
  const first = await fetchWithTimeout(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
  })
  const setCookies = first.headers.getSetCookie?.() ?? []
  const cookie = setCookies.map((c) => c.split(';')[0]).join('; ')
  await first.text().catch(() => '') // 读掉 body，免悬挂

  const second = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      ...(cookie ? { Cookie: cookie } : {}),
      Referer: BASE + '/',
    },
  })
  if (!second.ok) throw new Error(`gequhai HTTP ${second.status}`)
  return { html: await second.text(), cookie }
}

/** 取 window.<name> 的值 */
function pickVar(html: string, name: string): string {
  const m = html.match(
    new RegExp(`window\\.${name}\\s*=\\s*(?:'([^']*)'|"([^"]*)"|(\\d+))`)
  )
  return m ? m[1] ?? m[2] ?? m[3] ?? '' : ''
}

/** 解析搜索结果表格 */
function parseSearchTable(html: string): GequhaiSong[] {
  const results: GequhaiSong[] = []
  const seen = new Set<string>()

  for (const block of html.split(/<tr[^>]*>/i)) {
    const link = block.match(/<a\s+href="\/play\/(\d+)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!link) continue
    const id = link[1]
    if (seen.has(id)) continue
    const title = stripTags(link[2])
    if (!title) continue

    const after = block.slice(block.indexOf(link[0]) + link[0].length)
    const td = after.match(/<td[^>]*>([\s\S]*?)<\/td>/i)
    seen.add(id)
    results.push({ id, title, artist: td ? stripTags(td[1]) : '' })
  }
  return results
}

/** 抽 LRC */
function extractLrc(html: string): string {
  const m = html.match(/<div[^>]*id="content-lrc2"[^>]*>([\s\S]*?)<\/div>/i)
  if (!m) return ''
  return decodeEntities(m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.length > 0)
    .join('\n')
}

function plainLyrics(lrc: string): string {
  return lrc
    .split('\n')
    .map((l) => l.replace(/^\[\d{2}:\d{2}(?:\.\d{1,3})?\]\s*/, ''))
    .filter(Boolean)
    .join('\n')
}

/** POST /api/music 拿音频直链（play_id 一次性） */
async function fetchAudioUrl(
  playId: string,
  type: string,
  cookie: string,
  referer: string
): Promise<{ url: string; code: number; msg: string }> {
  if (!playId) return { url: '', code: 0, msg: 'no play_id' }

  const res = await fetchWithTimeout(`${BASE}/api/music`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'Http', // 字面量，写错就 403
      Referer: referer,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: `id=${encodeURIComponent(playId)}&type=${encodeURIComponent(type ?? 0)}`,
  })

  let payload: any = {}
  try {
    payload = await res.json()
  } catch {
    return { url: '', code: res.status, msg: 'bad json' }
  }

  if (payload?.code === 200 && payload?.data?.url) {
    return { url: payload.data.url, code: 200, msg: '' }
  }
  return {
    url: '',
    code: payload?.code ?? res.status,
    msg: payload?.msg || payload?.message || 'no url',
  }
}

// ─── 对外 API ───

/** 搜索 */
export async function searchSongs(keyword: string): Promise<GequhaiSong[]> {
  const q = String(keyword ?? '').trim()
  if (!q) throw new Error('请填写关键词')
  const { html } = await fetchPage(`${BASE}/search?s=${encodeURIComponent(q)}`)
  return parseSearchTable(html)
}

/** 详情 */
export async function getSongDetail(id: string | number): Promise<GequhaiDetail> {
  const safeId = String(id).trim()
  if (!/^\d+$/.test(safeId)) throw new Error('歌曲 id 不合法')

  const url = `${BASE}/play/${safeId}`
  const { html, cookie } = await fetchPage(url)
  const lrc = extractLrc(html)

  let audio = await fetchAudioUrl(pickVar(html, 'play_id'), pickVar(html, 'mp3_type'), cookie, url)
  // play_id 一次性：失败重试最多 3 次
  for (let attempt = 1; attempt < 3 && audio.code !== 200; attempt++) {
    await new Promise((r) => setTimeout(r, 1500))
    try {
      const again = await fetchPage(url)
      audio = await fetchAudioUrl(
        pickVar(again.html, 'play_id'),
        pickVar(again.html, 'mp3_type'),
        again.cookie,
        url
      )
    } catch {
      /* ignore */
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
  }
}

/** 下载音频（不带 Referer，否则酷我 CDN 拒） */
export async function downloadAudio(url: string): Promise<Buffer> {
  const u = String(url).trim()
  if (!/^https?:\/\//i.test(u)) throw new Error('音频地址不合法')

  const res = await fetchWithTimeout(u, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`音频下载失败 HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/** 嗅探音频格式 */
export function sniffAudioExt(buf: Buffer): string | null {
  if (!buf || buf.length < 12) return null
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return '.mp3'
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return '.mp3'
  if (buf[0] === 0x66 && buf[1] === 0x4c && buf[2] === 0x61 && buf[3] === 0x43) return '.flac'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    if (buf[8] === 0x57 && buf[9] === 0x41 && buf[10] === 0x56 && buf[11] === 0x45) return '.wav'
  }
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return '.m4a'
  if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return '.ogg'
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return '.webm'
  return null
}

// ─── 纯函数导出（可单测，不用联网） ───
export const __internal = {
  parseSearchTable,
  extractLrc,
  pickVar,
  plainLyrics,
}