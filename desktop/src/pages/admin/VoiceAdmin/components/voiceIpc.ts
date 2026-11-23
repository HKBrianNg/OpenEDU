// desktop/src/pages/admin/VoiceAdmin/components/voiceIpc.ts
//
// VoiceAdmin 主进程 IPC：课程项目解析 + edge-tts（微软语音）批量合成中英文朗读 mp3。
// 移植自 img-library/openEDU/tts_admin/main.py（tkinter + edge-tts + pygame），
// TTS 引擎改用 npm 的 msedge-tts（同一微软 Edge Read Aloud 接口，纯 JS 实现），
// 试听不再用 pygame，而是合成后以 base64 交给渲染层 <audio> 播放。
// 音频与 audio.json 元数据的目录结构、文件名、字段与 Python 版完全兼容。

import { ipcMain } from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { slugify } from '../../../../utils/voiceAssets'

import type {
  CloudVoice,
  GenProgress,
  GenTask,
  IpcResult,
  VoiceChapter,
  VoiceEntry,
  VoiceProject,
} from '../voiceTypes'

let LOCAL_DATA_ROOT = ''

export function configureVoiceIpc(opts: { localDataRoot: string }) {
  LOCAL_DATA_ROOT = opts.localDataRoot
}

// ─── 与 Python tts_admin 保持一致（EnglishWord 为字库项目，后加入）───
const ALLOWED_PROJECTS = ['EnglishShorts', 'BasicEnglish300', 'KnowledgeBase', 'EnglishWord']
const RATE = '-8%'
const AUDIO_FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3

export const DEFAULT_ZH_VOICE = 'zh-CN-XiaoxiaoNeural'
export const DEFAULT_EN_VOICE = 'en-US-JennyNeural'

// 兜底音色（云端 getVoices 不可用时用）
const FALLBACK_VOICES: CloudVoice[] = [
  { shortName: 'zh-CN-XiaoxiaoNeural', gender: 'Female', locale: 'zh-CN' },
  { shortName: 'zh-CN-XiaoyiNeural', gender: 'Female', locale: 'zh-CN' },
  { shortName: 'zh-CN-YunyangNeural', gender: 'Male', locale: 'zh-CN' },
  { shortName: 'zh-CN-YunxiNeural', gender: 'Male', locale: 'zh-CN' },
  { shortName: 'en-US-JennyNeural', gender: 'Female', locale: 'en-US' },
  { shortName: 'en-US-AriaNeural', gender: 'Female', locale: 'en-US' },
  { shortName: 'en-US-AnaNeural', gender: 'Female', locale: 'en-US' },
  { shortName: 'en-US-GuyNeural', gender: 'Male', locale: 'en-US' },
  { shortName: 'en-US-ChristopherNeural', gender: 'Male', locale: 'en-US' },
]

// ─── 工具 ───

// slugify 已抽到 src/utils/voiceAssets.ts（页面侧拼音频 URL 也要用同一规则），
// 这里直接导入共享实现，避免两边规则漂移。

interface EntryMeta {
  ok: boolean
  voice?: string
  rate?: string
  generated_at?: string
  error?: string
}

// audio.json 结构宽松，与 Python 写入格式保持兼容
type AudioMeta = { chapter?: string; entries?: Record<string, Record<string, EntryMeta>> }

/** 音频根目录：常规项目 <project>/audio；EnglishWord 用隐藏目录 <project>/.audio */
function audioRootOf(projectDir: string, project: string): string {
  return path.join(projectDir, project === 'EnglishWord' ? '.audio' : 'audio')
}

function audioMetaPath(audioRoot: string, stem: string): string {
  return path.join(audioRoot, stem, `${stem}.audio.json`)
}

function readAudioMeta(audioRoot: string, stem: string): AudioMeta {
  try {
    return JSON.parse(fs.readFileSync(audioMetaPath(audioRoot, stem), 'utf-8')) as AudioMeta
  } catch {
    return {}
  }
}

function entryStatus(
  audioRoot: string,
  stem: string,
  index: number,
  part: 'title' | 'content',
): { zhOk: boolean; enOk: boolean } {
  const es = readAudioMeta(audioRoot, stem).entries?.[String(index)] || {}
  if (part === 'content') {
    return { zhOk: !!es.zh_content_normal?.ok, enOk: !!es.en_content_normal?.ok }
  }
  return { zhOk: !!es.zh_normal?.ok, enOk: !!es.en_normal?.ok }
}

// ─── TTS 引擎：共享实例 + 串行队列 ───

let ttsInstance: MsEdgeTTS | null = null
let ttsVoice = ''
let ttsQueue: Promise<unknown> = Promise.resolve()

async function getTts(voice: string): Promise<MsEdgeTTS> {
  if (!ttsInstance) {
    ttsInstance = new MsEdgeTTS({ enableLogger: false })
    ttsVoice = ''
  }
  if (ttsVoice !== voice) {
    await ttsInstance.setMetadata(voice, AUDIO_FORMAT)
    ttsVoice = voice
  }
  return ttsInstance
}

/** 所有合成操作串行执行：同一 WebSocket 实例不能并发切音色 */
function withTts<T>(fn: () => Promise<T>): Promise<T> {
  const run = ttsQueue.then(fn, fn)
  ttsQueue = run.catch(() => {})
  return run
}

/** 合成一段文本 → 写出 mp3 文件，返回字节数 */
async function synthToFile(text: string, voice: string, outFile: string): Promise<number> {
  const tts = await getTts(voice)
  const { audioStream } = tts.toStream(text, { rate: RATE })
  const chunks: Buffer[] = []
  for await (const chunk of audioStream) chunks.push(chunk as Buffer)
  const buf = Buffer.concat(chunks)
  if (buf.length === 0) throw new Error('empty audio')
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, buf)
  return buf.length
}

// ─── 生成状态 ───

let generating = false
let cancelRequested = false

function sendProgress(sender: Electron.WebContents, p: GenProgress) {
  if (!sender.isDestroyed()) sender.send('voice:progress', p)
}

export function registerVoiceIpc() {
  // ─── 项目发现 ───
  ipcMain.handle('voice:projects', async (): Promise<IpcResult<VoiceProject[]>> => {
    const projects: VoiceProject[] = []
    for (const name of ALLOWED_PROJECTS) {
      if (fs.existsSync(path.join(LOCAL_DATA_ROOT, name, 'data.json'))) {
        projects.push({ name })
      }
    }
    return { ok: true, data: projects }
  })

  // ─── 云端音色列表 ───
  ipcMain.handle('voice:voices', async (): Promise<IpcResult<CloudVoice[]>> => {
    try {
      const t = new MsEdgeTTS({ enableLogger: false })
      try {
        const voices = await t.getVoices()
        return {
          ok: true,
          data: voices
            .filter((v) => v.ShortName.startsWith('zh-CN') || v.ShortName.startsWith('en-'))
            .map((v) => ({ shortName: v.ShortName, gender: v.Gender, locale: v.Locale })),
        }
      } finally {
        t.close()
      }
    } catch {
      return { ok: true, data: FALLBACK_VOICES }
    }
  })

  // ─── 加载项目条目（data.json → content/*.json，chapters / groups 两种结构）───
  ipcMain.handle(
    'voice:load',
    async (
      _e,
      projectName: string,
    ): Promise<IpcResult<{ chapters: VoiceChapter[]; entries: VoiceEntry[] }>> => {
      if (!ALLOWED_PROJECTS.includes(projectName)) return { ok: false, error: 'invalidProject' }
      const projectDir = path.join(LOCAL_DATA_ROOT, projectName)
      const audioRoot = audioRootOf(projectDir, projectName)
      const dataFile = path.join(projectDir, 'data.json')
      if (!fs.existsSync(dataFile)) return { ok: false, error: 'noDataJson' }
      try {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'))
        const chapters: VoiceChapter[] = []
        const entries: VoiceEntry[] = []

        // 同章节内 slug 必须唯一（EnglishWord 有重复单词，如「橙子/橙黄色」都是 orange），
        // 重复时追加 -2、-3 序号；按 stem 分别跟踪。
        const usedSlugs = new Map<string, Set<string>>()
        const uniqueSlug = (stem: string, base: string): string => {
          let set = usedSlugs.get(stem)
          if (!set) {
            set = new Set()
            usedSlugs.set(stem, set)
          }
          if (!set.has(base)) {
            set.add(base)
            return base
          }
          for (let n = 2; ; n += 1) {
            const candidate = `${base}-${n}`
            if (!set.has(candidate)) {
              set.add(candidate)
              return candidate
            }
          }
        }

        // 一个条目最多拆成两行音频单元：标题读音 + 正文读音。
        // KnowledgeBase 用 content.zh/en；EnglishWord 词条用 name/en + zh_sentense/en_sentense（例句）。
        // 正文文件名 <slug>_content_{zh,en}.mp3，meta 键 {zh,en}_content_normal，与标题行共存于同一 index。
        const pushEntry = (stem: string, index: number, chapter: string, it: Record<string, unknown>) => {
          const title = it.title as Record<string, string> | undefined
          const content = it.content as Record<string, string> | undefined
          const titleZh = String((title?.zh ?? it.zh ?? it.name) || '').trim()
          const titleEn = String((title?.en ?? it.en) || '').trim()
          const contentZh = String(content?.zh ?? it.zh_sentense ?? '').trim()
          const contentEn = String(content?.en ?? it.en_sentense ?? '').trim()
          if (!titleZh && !titleEn && !contentZh && !contentEn) return
          let slug = slugify(titleEn) || slugify(titleZh)
          if (!slug) slug = `${stem}_${String(index + 1).padStart(3, '0')}`
          slug = uniqueSlug(stem, slug)

          if (titleZh || titleEn) {
            const st = entryStatus(audioRoot, stem, index, 'title')
            entries.push({
              id: `${stem}_${index}`,
              stem,
              index,
              chapter,
              part: 'title',
              slug,
              zh: titleZh,
              en: titleEn,
              zhOk: st.zhOk,
              enOk: st.enOk,
            })
          }
          if (contentZh || contentEn) {
            const st = entryStatus(audioRoot, stem, index, 'content')
            entries.push({
              id: `${stem}_${index}_content`,
              stem,
              index,
              chapter,
              part: 'content',
              slug: `${slug}_content`,
              zh: contentZh,
              en: contentEn,
              zhOk: st.zhOk,
              enOk: st.enOk,
            })
          }
        }

        const readItems = (link: string, _chapter: string): Record<string, unknown>[] => {
          if (!link) return []
          // 常规项目在 content/ 下；EnglishWord 的章节文件直接放在项目根目录
          const candidates = [path.join(projectDir, 'content', link), path.join(projectDir, link)]
          const file = candidates.find((f) => fs.existsSync(f))
          if (!file) return []
          try {
            const items = JSON.parse(fs.readFileSync(file, 'utf-8'))
            return Array.isArray(items) ? items : [items]
          } catch {
            return []
          }
        }

        if (Array.isArray(data?.chapters) && data.chapters.length > 0) {
          for (const ch of data.chapters) {
            const name = String(ch.name || '')
            const en = String(ch.en || '')
            const link = String(ch.contentLink || '')
            if (!link) continue
            chapters.push({ name, en })
            const stem = path.basename(link, path.extname(link))
            readItems(link, name).forEach((it, i) => pushEntry(stem, i, name, it))
          }
        } else if (Array.isArray(data?.groups) && data.groups.length > 0) {
          for (const g of data.groups) {
            const name = String(g.name || g.title?.zh || '')
            const en = String(g.en || g.title?.en || '')
            const gStem = slugify(en) || slugify(name)
            chapters.push({ name, en })
            const items = Array.isArray(g.items) ? g.items : []
            items.forEach((it: Record<string, unknown>, i: number) => pushEntry(gStem, i, name, it))
          }
        }

        return { ok: true, data: { chapters, entries } }
      } catch (err) {
        return { ok: false, error: (err as Error).message }
      }
    },
  )

  // ─── 试听：合成 → base64（渲染层用 <audio src="data:audio/mpeg;base64,...">）───
  ipcMain.handle('voice:preview', async (_e, text: string, voice: string): Promise<IpcResult<string>> => {
    if (!text?.trim()) return { ok: false, error: 'emptyText' }
    try {
      const tmp = path.join(os.tmpdir(), `voice_preview_${Date.now()}_${Math.floor(Math.random() * 1e6)}.mp3`)
      await withTts(() => synthToFile(text, voice, tmp))
      const buf = fs.readFileSync(tmp)
      try {
        fs.unlinkSync(tmp)
      } catch {
        /* 临时文件删除失败无碍 */
      }
      return { ok: true, data: buf.toString('base64') }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  // ─── 批量生成（写 mp3 + 回写 audio.json，进度经 voice:progress 推送）───
  ipcMain.handle(
    'voice:generate',
    async (
      e,
      args: { project: string; tasks: GenTask[]; zhVoice: string; enVoice: string; force: boolean },
    ): Promise<IpcResult<{ generated: number; skipped: number }>> => {
      if (!ALLOWED_PROJECTS.includes(args?.project || '')) return { ok: false, error: 'invalidProject' }
      if (generating) return { ok: false, error: 'alreadyGenerating' }
      const tasks = (args.tasks || []).filter((t) => t && (t.genZh || t.genEn))
      if (tasks.length === 0) return { ok: false, error: 'noTasks' }

      generating = true
      cancelRequested = false
      const sender = e.sender
      const projectDir = path.join(LOCAL_DATA_ROOT, args.project)
      const audioRoot = audioRootOf(projectDir, args.project)
      let generated = 0
      let skipped = 0
      let done = 0
      const total = tasks.length

      sendProgress(sender, { stage: 'start', done: 0, total, slug: '', lang: '', ok: true })

      try {
        for (const task of tasks) {
          if (cancelRequested) break
          const meta = readAudioMeta(audioRoot, task.stem)
          meta.chapter = meta.chapter ?? task.stem
          meta.entries = meta.entries ?? {}
          const es = (meta.entries[String(task.index)] = meta.entries[String(task.index)] || {})

          const genOne = async (lang: 'zh' | 'en') => {
            const text = lang === 'zh' ? task.zh : task.en
            const voice = lang === 'zh' ? args.zhVoice : args.enVoice
            const key =
              task.part === 'content'
                ? lang === 'zh'
                  ? 'zh_content_normal'
                  : 'en_content_normal'
                : lang === 'zh'
                  ? 'zh_normal'
                  : 'en_normal'
            const file = path.join(audioRoot, task.stem, `${task.slug}_${lang}.mp3`)
            const prev = es[key] as EntryMeta | undefined
            const need = args.force || !fs.existsSync(file) || !prev?.ok
            if (!need) {
              skipped += 1
              return
            }
            try {
              await synthToFile(text, voice, file)
              es[key] = { ok: true, voice, rate: RATE, generated_at: new Date().toISOString() }
              generated += 1
              sendProgress(sender, {
                stage: 'item',
                done: done + 1,
                total,
                slug: task.slug,
                lang,
                ok: true,
              })
            } catch (err) {
              es[key] = { ok: false, error: String((err as Error).message).slice(0, 200) }
              sendProgress(sender, {
                stage: 'item',
                done: done + 1,
                total,
                slug: task.slug,
                lang,
                ok: false,
                error: (err as Error).message,
              })
            }
          }

          if (task.genZh && task.zh) await genOne('zh')
          if (!cancelRequested && task.genEn && task.en) await genOne('en')

          // 每条处理完立即回写 audio.json，中断也不丢已完成部分
          fs.mkdirSync(path.dirname(audioMetaPath(audioRoot, task.stem)), { recursive: true })
          fs.writeFileSync(audioMetaPath(audioRoot, task.stem), JSON.stringify(meta, null, 2), 'utf-8')

          done += 1
        }

        return { ok: true, data: { generated, skipped } }
      } catch (err) {
        return { ok: false, error: (err as Error).message }
      } finally {
        generating = false
        sendProgress(sender, {
          stage: 'done',
          done,
          total,
          slug: cancelRequested ? 'cancelled' : '',
          lang: '',
          ok: !cancelRequested,
        })
      }
    },
  )

  // ─── 取消生成 ───
  ipcMain.handle('voice:cancel', async (): Promise<IpcResult<null>> => {
    if (generating) cancelRequested = true
    return { ok: true, data: null }
  })
}
