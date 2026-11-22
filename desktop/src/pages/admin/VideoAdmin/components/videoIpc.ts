// desktop/src/pages/admin/VideoAdmin/components/videoIpc.ts
//
// 视频目录管理的主进程逻辑 + IPC 注册。
// 从 tools/electron/video.cjs 移植（loadCatalog / yt-dlp 搜索 / 抓字幕），并补上
// tools 里没有的 update / remove —— 与 SongsAdmin 的能力对齐。
//
// 存储结构与 tools 完全一致（同一份 <dataRoot>/EnglishVideo 仓库）：
//   <root>/EnglishVideo/data.json              章节索引 { chapters:[{name, contentLink}] }
//   <root>/EnglishVideo/<grade>/<grade>.json   条目 { items:[{id, series, episode, ...}] }
//   <root>/EnglishVideo/<grade>/transcripts/   台词 JSON
//
// yt-dlp 靠 PATH（pip install yt-dlp），不需要 API key。

import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, mkdtempSync, readdirSync } from 'fs'
import { join, basename } from 'path'
import os from 'os'
import { spawn } from 'child_process'

// ─── 配置注入 ───

let LOCAL_DATA_ROOT = ''

export function configureVideoIpc(opts: { localDataRoot: string }) {
  LOCAL_DATA_ROOT = opts.localDataRoot
}

// ─── 路径工具 ───

const COURSE_ID = 'EnglishVideo'

function courseSub(...parts: string[]): string {
  const abs = join(LOCAL_DATA_ROOT, COURSE_ID, ...parts)
  if (!abs.startsWith(join(LOCAL_DATA_ROOT, COURSE_ID))) throw new Error('路径越界')
  return abs
}

/** "K2.json" → "K2" */
const dirOf = (contentLink: string) => String(contentLink ?? '').replace(/\.json$/i, '')

// ─── JSON 读写（保留原文件 CRLF/末尾换行风格，避免无意义 diff）───

function readJson<T = any>(f: string): T {
  return JSON.parse(readFileSync(f, 'utf8'))
}

function writeJsonLike(file: string, src: string, data: unknown) {
  const eol = src.includes('\r\n') ? '\r\n' : '\n'
  const endNl = /(\r?\n)\s*$/.exec(src)
  writeFileSync(
    file,
    JSON.stringify(data, null, 2).replace(/\n/g, eol) + (endNl ? endNl[1] : ''),
    'utf8'
  )
}

// ─── 子进程 ───

/**
 * 清掉 NODE_OPTIONS：某些 IDE 会往环境里塞 node shim，yt-dlp 解 YouTube
 * JS 挑战时派生 node 会被它掐死，报 "challenge solving failed"。
 */
function childEnv() {
  const env = { ...process.env }
  delete env.NODE_OPTIONS
  return env
}

function run(cmd: string, args: string[], onLog?: (l: string) => void, timeoutMs = 180000) {
  return new Promise<{ code: number; stdout: string }>((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true, env: childEnv() })
    let out = ''
    let done = false

    const timer = setTimeout(() => {
      if (done) return
      done = true
      p.kill('SIGKILL')
      reject(new Error(`超时（${Math.round(timeoutMs / 1000)} 秒）`))
    }, timeoutMs)

    const push = (chunk: any) => {
      const s = String(chunk)
      out += s
      s.split(/\r?\n/)
        .filter((l: string) => l.trim())
        .forEach((l: string) => onLog?.(l))
    }
    p.stdout?.on('data', push)
    p.stderr?.on('data', push)

    p.on('error', (e: Error) => {
      if (done) return
      done = true
      clearTimeout(timer)
      reject(
        /ENOENT/.test(e.message)
          ? new Error('没找到 yt-dlp —— 先装：pip install yt-dlp')
          : new Error(e.message)
      )
    })

    p.on('close', (code: number) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve({ code, stdout: out })
    })
  })
}

// ─── VTT 解析 ───

/** "00:01:02.500" → "01:02" */
function toClock(hms: string): string {
  const m = String(hms).match(/(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,]\d+)?/)
  if (!m) return '00:00'
  const h = Number(m[1] ?? 0)
  const mm = Number(m[2]) + h * 60
  return `${String(mm).padStart(2, '0')}:${m[3]}`
}

/** 解析 WebVTT：剥标签 + 按时间线相邻去重（YouTube 滚动式字幕） */
function parseVtt(text: string) {
  const raw = String(text ?? '').split(/\r?\n/)
  const cues: { start: string; text: string }[] = []

  for (let i = 0; i < raw.length; i++) {
    const m = raw[i].match(
      /(\d{1,2}:\d{2}:\d{2}[.,]\d{3}|\d{1,2}:\d{2}[.,]\d{3}|\d{1,2}:\d{2})\s*-->\s*(\S+)/
    )
    if (!m) continue

    const buf: string[] = []
    let j = i + 1
    while (j < raw.length && raw[j].trim() !== '') {
      buf.push(raw[j])
      j++
    }
    i = j

    const line = buf
      .join(' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (line) cues.push({ start: m[1], text: line })
  }

  const out: { start: string; text: string }[] = []
  cues.forEach((c) => {
    const prev = out[out.length - 1]
    if (prev && prev.text === c.text) return
    if (prev && prev.text.endsWith(c.text)) return
    out.push(c)
  })

  return out.map((c, i) => ({
    index: i + 1,
    start: toClock(c.start),
    en: c.text,
    zh: '', // 中文留给人工/AI 补
  }))
}

/** "Peppa Pig: Muddy Puddles" → "PeppaPigMuddyPuddles.json"；纯中文标题退化 Item{id}.json */
function suggestFileName(titleEn: string, id: number): string {
  const words = String(titleEn ?? '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
  if (words.length === 0) return `Item${id}.json`
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join('') + '.json'
}

// ─── 目录读写 ───

function readGrades() {
  const dir = courseSub('')
  const index = readJson<any>(courseSub('data.json'))
  const chapters = Array.isArray(index?.chapters) ? index.chapters : []
  return { dir, chapters }
}

/** 读全量视频目录，顺带探测台词文件是否存在且非空 */
function loadCatalog() {
  const { dir, chapters } = readGrades()

  const rows: any[] = []
  const problems: string[] = []
  const grades: { value: string; label: string }[] = []

  chapters.forEach((c: any) => {
    const grade = dirOf(c.contentLink ?? '')
    if (grade) grades.push({ value: grade, label: c.name ? `${c.name}（${grade}）` : grade })
    try {
      const items = readJson<any>(courseSub(grade, c.contentLink))?.items ?? []

      items.forEach((it: any) => {
        const tf = it?.transcriptFile ?? ''
        let has = false
        let lineCount = 0
        if (tf) {
          try {
            const j = readJson<any>(courseSub(grade, tf))
            lineCount = Array.isArray(j?.lines) ? j.lines.length : 0
            has = lineCount > 0
          } catch {
            /* 台词文件还没生成，正常 */
          }
        }
        rows.push({
          key: `${grade}#${it?.id ?? 0}`,
          grade,
          gradeName: c.name ?? grade,
          id: it?.id ?? 0,
          series: it?.series ?? '',
          episode: it?.episode ?? '',
          titleEn: it?.englishName ?? '',
          titleZh: it?.chineseName ?? '',
          duration: it?.durationPerEpisode ?? '',
          url: it?.url ?? '',
          transcriptFile: tf,
          hasTranscript: has,
          lineCount,
        })
      })
    } catch (err: any) {
      problems.push(`「${c.name}」读取失败：${err.message}`)
    }
  })

  return { rows, problems, grades, courseDir: dir }
}

/** 把解析好的台词写进仓库，并把 transcriptFile 回写到年级 JSON */
function writeTranscript(item: any, lines: any[]) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('台词是空的')

  const outDir = courseSub(String(item.grade ?? ''), 'transcripts')
  mkdirSync(outDir, { recursive: true })

  const fileName = String(item.transcriptFile ?? '').trim()
    ? basename(String(item.transcriptFile))
    : suggestFileName(item.titleEn, item.id)
  writeFileSync(courseSub(String(item.grade ?? ''), 'transcripts', String(fileName)), JSON.stringify({ lines }, null, 2), 'utf8')

  const gradeFile = courseSub(String(item.grade ?? ''), `${item.grade}.json`)
  const gradeSrc = readFileSync(gradeFile, 'utf8')
  const gradeData = JSON.parse(gradeSrc)
  const arr = Array.isArray(gradeData?.items) ? gradeData.items : []
  const target = arr.find((x: any) => Number(x?.id) === Number(item.id))
  if (target) {
    target.transcriptFile = `transcripts/${fileName}`
    writeJsonLike(gradeFile, gradeSrc, gradeData)
  }

  return { ok: true, file: `transcripts/${fileName}`, lines: lines.length, id: item.id }
}

/** 导入本地字幕文件（vtt / srt），网络抓不到时的兜底 */
async function importTranscript(item: any, srcPath: string) {
  const src = String(srcPath ?? '').trim()
  if (!src) throw new Error('没选字幕文件')
  if (!existsSync(src)) throw new Error(`文件不存在：${src}`)
  if (!/\.(vtt|srt)$/i.test(src)) throw new Error('只支持 .vtt 和 .srt')

  const lines = parseVtt(readFileSync(src, 'utf8'))
  return writeTranscript(item, lines)
}

/** 抓一条视频的字幕：yt-dlp 只下字幕 → 解析 vtt → 写 transcripts/ → 回写年级 JSON */
async function fetchTranscript(item: any, onLog?: (l: string) => void) {
  const url = String(item?.url ?? '').trim()
  if (!url) throw new Error('这条视频没有 URL')
  if (!/^https?:\/\//i.test(url)) throw new Error(`URL 不合法：${url}`)

  const tmp = mkdtempSync(join(os.tmpdir(), 'openedu-yt-'))
  const base = `${item.grade}-${item.id}`
  const tpl = join(tmp, `${base}.%(ext)s`)

  try {
    const r = await run(
      'yt-dlp',
      [
        '--skip-download',
        '--write-auto-subs',
        '--write-subs',
        '--sub-langs', 'en.*',
        '--sub-format', 'vtt',
        '--js-runtimes', 'node',
        '--remote-components', 'ejs:github',
        '-o', tpl,
        url,
      ],
      onLog
    )

    if (r.code !== 0) {
      const s = r.stdout || ''
      if (/challenge solving failed|JS runtime/i.test(s)) {
        throw new Error('YouTube 需要解 JS 挑战，本机取不到 solver 脚本（网络限制）。可以改用「导入本地字幕」')
      }
      if (/not available|video is unavailable/i.test(s)) {
        throw new Error('这个视频在 YouTube 上取不到（可能下架/地区限制）。可以改用「导入本地字幕」')
      }
      throw new Error(/unsupported url/i.test(s) ? 'URL 无法识别' : 'yt-dlp 执行失败')
    }

    const vtt = readdirSync(tmp).filter((f) => f.startsWith(base) && f.endsWith('.vtt'))
    if (vtt.length === 0) throw new Error('这个视频没有可用的英文字幕')

    const lines = parseVtt(readFileSync(join(tmp, vtt[0]), 'utf8'))
    return writeTranscript(item, lines)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

// ─── 在线搜索 / 导入 ───

/** 网上搜视频（yt-dlp ytsearch，无 API key） */
async function searchOnline(keyword: string, limit = 12) {
  const kw = String(keyword ?? '').trim()
  if (!kw) throw new Error('请输入搜索关键词')

  const n = Math.min(Math.max(Number(limit) || 12, 1), 30)
  const sep = '\t'
  const r = await run(
    'yt-dlp',
    [
      '--flat-playlist',
      '--no-warnings',
      '--print',
      ['%(id)s', '%(title)s', '%(channel)s', '%(duration_string)s'].join(sep),
      `ytsearch${n}:${kw}`,
    ],
    undefined,
    90000
  )

  const out = r.stdout ?? ''
  if (r.code !== 0) {
    throw new Error(
      /HTTPError 429|Too Many Requests/i.test(out)
        ? 'YouTube 限流了，等一会儿再试'
        : /network|timed out|Could not reach|unable to download/i.test(out)
          ? '连不上 YouTube'
          : 'yt-dlp 搜索失败'
    )
  }

  const seen = new Set<string>()
  const rows: any[] = []
  out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [id, title, channel, duration] = line.split(sep)
      if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) return
      if (seen.has(id)) return
      seen.add(id)
      rows.push({
        videoId: id,
        title: title || '(无标题)',
        channel: channel || '',
        duration: duration || '',
        url: `https://www.youtube.com/watch?v=${id}`,
      })
    })

  return rows
}

/** 往年级 JSON 里加一条新视频（同 url 查重；id 取 max+1） */
function addVideoItem(input: any) {
  const grade = String(input?.grade ?? '').trim()
  if (!grade) throw new Error('没选年级')

  const gradeFile = courseSub(grade, `${grade}.json`)
  const src = readFileSync(gradeFile, 'utf8')
  const data = JSON.parse(src)
  const items = Array.isArray(data?.items) ? data.items : []

  const url = String(input?.url ?? '').trim()
  if (!/^https?:\/\//i.test(url)) throw new Error(`视频 URL 不合法：${url || '(空)'}`)
  if (items.some((x: any) => String(x?.url ?? '').trim() === url)) {
    throw new Error('这条视频已经在目录里了')
  }

  const nextId = items.reduce((m: number, x: any) => Math.max(m, Number(x?.id) || 0), 0) + 1
  const item = {
    id: nextId,
    series: String(input?.series ?? '').trim(),
    episode: String(input?.episode ?? '').trim(),
    englishName: String(input?.titleEn ?? '').trim(),
    chineseName: String(input?.titleZh ?? '').trim(),
    durationPerEpisode: String(input?.duration ?? '').trim(),
    channel: String(input?.channel ?? '').trim(),
    platform: String(input?.platform ?? '').trim(),
    url,
  }

  items.push(item)
  writeJsonLike(gradeFile, src, data)

  return { ok: true, id: nextId, grade, item }
}

/** 导入在线视频：先写目录（立刻可见），再抓字幕（失败不影响已加的条目） */
async function importOnline(input: any, onLog?: (l: string) => void) {
  const added = addVideoItem(input)

  if (!input?.fetchSubs) return { ...added, transcript: null }

  const item = {
    grade: added.grade,
    id: added.id,
    titleEn: added.item.englishName,
    url: added.item.url,
    transcriptFile: '',
  }

  try {
    return { ...added, transcript: await fetchTranscript(item, onLog) }
  } catch (err: any) {
    return { ...added, transcript: { ok: false, error: err.message } }
  }
}

// ─── 编辑 / 删除（tools 没有的能力，对齐 SongsAdmin）───

/** 编辑视频条目的文本字段（按 grade+id 定位） */
function updateVideo(payload: any) {
  const grade = String(payload?.grade ?? '').trim()
  const id = Number(payload?.id ?? 0)
  if (!grade || !id) throw new Error('缺少年级或 id')

  const gradeFile = courseSub(grade, `${grade}.json`)
  const src = readFileSync(gradeFile, 'utf8')
  const data = JSON.parse(src)
  const arr = Array.isArray(data?.items) ? data.items : []
  const target = arr.find((x: any) => Number(x?.id) === id)
  if (!target) throw new Error(`未找到视频：#${id}`)

  if (payload.series !== undefined) target.series = String(payload.series ?? '').trim()
  if (payload.episode !== undefined) target.episode = String(payload.episode ?? '').trim()
  if (payload.titleEn !== undefined) target.englishName = String(payload.titleEn ?? '').trim()
  if (payload.titleZh !== undefined) target.chineseName = String(payload.titleZh ?? '').trim()
  writeJsonLike(gradeFile, src, data)

  return { ok: true, id }
}

/** 删除视频条目：从年级 JSON 移除，并连带删除台词文件（有字幕时） */
function removeVideo(payload: any) {
  const grade = String(payload?.grade ?? '').trim()
  const id = Number(payload?.id ?? 0)
  if (!grade || !id) throw new Error('缺少年级或 id')

  const gradeFile = courseSub(grade, `${grade}.json`)
  const src = readFileSync(gradeFile, 'utf8')
  const data = JSON.parse(src)
  const arr = Array.isArray(data?.items) ? data.items : []
  const target = arr.find((x: any) => Number(x?.id) === id)
  if (!target) throw new Error(`未找到视频：#${id}`)

  const tf = String(target?.transcriptFile ?? '').trim()
  if (tf) {
    rmSync(courseSub(grade, tf), { force: true })
  }

  data.items = arr.filter((x: any) => Number(x?.id) !== id)
  writeJsonLike(gradeFile, src, data)

  return { ok: true, id }
}

// ─── IPC 注册 ───

/** 从 IPC 事件推 yt-dlp 日志给发起方渲染层（channel: yt:log） */
function pushLog(e: IpcMainInvokeEvent, line: string) {
  try {
    e.sender.send('yt:log', { type: 'log', line })
  } catch {
    /* 窗口已关 */
  }
}

const transcriptItemOf = (payload: any) => ({
  grade: String(payload?.grade ?? ''),
  id: Number(payload?.id ?? 0),
  titleEn: String(payload?.titleEn ?? ''),
  url: String(payload?.url ?? ''),
  transcriptFile: String(payload?.transcriptFile ?? ''),
})

export function registerVideoIpc() {
  ipcMain.handle('videos:load', async () => {
    try {
      return { ok: true, ...loadCatalog() }
    } catch (err: any) {
      console.error('[videos:load] ERROR', err.message)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('videos:search', async (_e, payload: any) => {
    try {
      const rows = await searchOnline(payload?.keyword, payload?.limit)
      return { ok: true, data: rows }
    } catch (err: any) {
      console.error('[videos:search] ERROR', err.message)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('videos:import-online', async (e, payload: any) => {
    try {
      const res = await importOnline(payload, (l) => pushLog(e, l))
      return { ok: true, data: res }
    } catch (err: any) {
      console.error('[videos:import-online] ERROR', err.message)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('videos:fetch-transcript', async (e, payload: any) => {
    try {
      const res = await fetchTranscript(transcriptItemOf(payload), (l) => pushLog(e, l))
      return { ok: true, data: res }
    } catch (err: any) {
      console.error('[videos:fetch-transcript] ERROR', err.message)
      return { ok: false, error: err.message }
    }
  })

  // 批量抓字幕：逐条跑 yt-dlp（串行，避免并发触发 YouTube 风控），
  // 进度经 videos:progress 事件推给发起方
  ipcMain.handle('videos:fetch-transcripts-batch', async (e, payload: any) => {
    const items: any[] = Array.isArray(payload?.items) ? payload.items : []
    if (items.length === 0) return { ok: false, error: '没有勾选任何视频' }
    const total = items.length
    const push = (p: any) => {
      try {
        e.sender.send('videos:progress', p)
      } catch {
        /* 窗口已关 */
      }
    }
    const results: any[] = []
    for (let i = 0; i < total; i++) {
      const it = transcriptItemOf(items[i])
      push({ stage: 'start', n: i + 1, total, titleEn: it.titleEn || `#${it.id}` })
      try {
        const res = await fetchTranscript(it, (l) => pushLog(e, l))
        results.push({ grade: it.grade, id: it.id, ok: true, lines: res.lines, file: res.file })
        push({ stage: 'done', n: i + 1, total, titleEn: it.titleEn || `#${it.id}`, ok: true, lines: res.lines })
      } catch (err: any) {
        results.push({ grade: it.grade, id: it.id, ok: false, error: err.message })
        push({ stage: 'done', n: i + 1, total, titleEn: it.titleEn || `#${it.id}`, ok: false, error: err.message })
      }
    }
    return { ok: true, data: { results, ok: results.every((r) => r.ok) } }
  })

  ipcMain.handle('videos:import-transcript', async (_e, payload: any) => {
    try {
      const res = await importTranscript(transcriptItemOf(payload), payload?.srcPath)
      return { ok: true, data: res }
    } catch (err: any) {
      console.error('[videos:import-transcript] ERROR', err.message)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('videos:update', async (_e, payload: any) => {
    try {
      return updateVideo(payload)
    } catch (err: any) {
      console.error('[videos:update] ERROR', err.message)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('videos:remove', async (_e, payload: any) => {
    try {
      return removeVideo(payload)
    } catch (err: any) {
      console.error('[videos:remove] ERROR', err.message)
      return { ok: false, error: err.message }
    }
  })
}
