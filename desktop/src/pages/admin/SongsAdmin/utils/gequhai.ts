// desktop/src/pages/admin/SongsAdmin/utils/gequhai.ts

// ─── 类型导出 ───
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

// ─── 新增：走隐藏窗口拿音频直链 ───
import { resolveAudioViaRenderer } from '../../../../../electron/audioResolver'

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

function extractCookies(response: Response): string {
  if (typeof response.headers.getSetCookie === 'function') {
    const setCookies = response.headers.getSetCookie()
    return setCookies.map((c) => c.split(';')[0]).join('; ')
  }
  const raw = response.headers as any
  if (typeof raw.raw === 'function') {
    const rawHeaders = raw.raw()
    const setCookieArr: string[] = rawHeaders['set-cookie'] ?? rawHeaders['Set-Cookie'] ?? []
    return setCookieArr.map((c: string) => c.split(';')[0]).join('; ')
  }
  const allHeaders: string[] = []
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') allHeaders.push(value)
  })
  return allHeaders.map((c) => c.split(';')[0]).join('; ')
}

/**
 * 两步 cookie 挑战，并把两次 set-cookie 合并
 */
async function fetchPage(url: string): Promise<{ html: string; cookie: string }> {
  const first = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  })

  const firstCookie = extractCookies(first)
  await first.text().catch(() => '')

  const second = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Dest': 'document',
      ...(firstCookie ? { Cookie: firstCookie } : {}),
      Referer: BASE + '/',
    },
  })

  const secondCookie = extractCookies(second)
  const mergedCookie = [firstCookie, secondCookie].filter(Boolean).join('; ')

  if (!second.ok) {
    throw new Error(`gequhai HTTP ${second.status} (url: ${url})`)
  }

  const html = await second.text()
  console.log('[fetchPage]', {
    url,
    firstCookieLen: firstCookie.length,
    secondCookieLen: secondCookie.length,
    mergedCookieLen: mergedCookie.length,
    htmlLen: html.length,
    hasPlayLink: html.includes('/play/'),
  })

  return { html, cookie: mergedCookie }
}

function pickVar(html: string, name: string): string {
  const m = html.match(
    new RegExp(`window\\.${name}\\s*=\\s*(?:'([^']*)'|"([^"]*)"|(\\d+))`)
  )
  return m ? m[1] ?? m[2] ?? m[3] ?? '' : ''
}

function extractAllWindowVars(html: string): Record<string, string> {
  const vars: Record<string, string> = {}
  const matches = html.matchAll(/window\.(\w+)\s*=\s*(?:'([^']*)'|"([^"]*)"|(\d+)|([^;<\s][^;<\s]*?)(?=\s*[;<]|\s*$))/g)
  for (const m of matches) {
    vars[m[1]] = m[2] ?? m[3] ?? m[4] ?? m[5] ?? ''
  }
  return vars
}

function parseSearchTable(html: string): GequhaiSong[] {
  const results: GequhaiSong[] = []
  const seen = new Set<string>()

  const trBlocks = html.split(/<tr[^>]*>/i)
  const divBlocks = html.split(/<div[^>]*class="[^"]*item[^"]*"[^>]*>/i)

  for (const block of trBlocks) {
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

  if (results.length === 0) {
    for (const block of divBlocks) {
      const link = block.match(/<a\s+href="\/play\/(\d+)"[^>]*>([\s\S]*?)<\/a>/i)
      if (!link) continue
      const id = link[1]
      if (seen.has(id)) continue
      const title = stripTags(link[2])
      if (!title) continue
      seen.add(id)
      results.push({ id, title, artist: '' })
    }
  }

  console.log('[parseSearchTable] parsed count:', results.length)
  return results
}

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

// ─── 对外 API ───

export async function searchSongs(keyword: string): Promise<GequhaiSong[]> {
  const q = String(keyword ?? '').trim()
  if (!q) throw new Error('请填写关键词')

  console.log('[searchSongs] searching for:', q)
  const { html } = await fetchPage(`${BASE}/search?s=${encodeURIComponent(q)}`)

  const hasPlayLink = html.includes('/play/')
  console.log('[searchSongs] htmlLen=', html.length, 'hasPlayLink=', hasPlayLink)

  if (!hasPlayLink) {
    console.warn('[searchSongs] 搜索页 HTML 里没有 /play/ 链接，可能页面结构变了或被拦截')
    console.log('[searchSongs] html head:', html.slice(0, 500))
  }

  return parseSearchTable(html)
}

export async function getSongDetail(id: string | number): Promise<GequhaiDetail> {
  const safeId = String(id).trim()
  if (!/^\d+$/.test(safeId)) throw new Error('歌曲 id 不合法')

  const url = `${BASE}/play/${safeId}`
  const { html, cookie } = await fetchPage(url)
  const lrc = extractLrc(html)

  const playId = pickVar(html, 'play_id')
  const mp3Type = pickVar(html, 'mp3_type')
  const allWindowVars = extractAllWindowVars(html)

  console.log('[getSongDetail] DIAG', {
    songId: safeId,
    playId,
    mp3Type,
    cookieLen: cookie.length,
    cookiePreview: cookie.slice(0, 120),
    htmlHasPlayLink: html.includes('/play/'),
    allWindowVarKeys: Object.keys(allWindowVars),
    allWindowVarValues: Object.fromEntries(
      Object.entries(allWindowVars).filter(([k]) =>
        /play|id|mp3|song|audio|type|token|sign|csrf/i.test(k)
      )
    ),
  })

  // ★ 走隐藏窗口拿音频直链，绕过 403
  let audio: { url: string; code: number; msg: string }
  try {
    audio = await resolveAudioViaRenderer(playId, mp3Type, safeId)
  } catch (err: any) {
    console.error('[getSongDetail] resolveAudioViaRenderer failed:', err.message)
    audio = { url: '', code: 0, msg: err.message }
  }

  console.log('[getSongDetail] audio result:', {
    code: audio.code,
    msg: audio.msg,
    hasUrl: !!audio.url,
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

export async function downloadAudio(url: string): Promise<Buffer> {
  const u = String(url).trim()
  if (!/^https?:\/\//i.test(u)) throw new Error('音频地址不合法')

  const res = await fetchWithTimeout(u, {
    headers: {
      'User-Agent': UA,
      Referer: BASE + '/',
      Origin: BASE,
    },
  })
  if (!res.ok) throw new Error(`音频下载失败 HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

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

export const __internal = {
  parseSearchTable,
  extractLrc,
  pickVar,
  plainLyrics,
  extractAllWindowVars,
}