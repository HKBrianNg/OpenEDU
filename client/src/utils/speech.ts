// client/src/utils/speech.ts
// 统一封装浏览器的 Web Speech API。
//
// 为什么要这一层：
// 1) 不指定 voice 时，浏览器会挑一个「默认」中文音色，通常是系统里最老的那个
//    （Windows 上多为 Huihui），念起来非常生硬。这里按喜好度打分挑最好的一个。
// 2) 把整段文字塞进一个 utterance，引擎会一口气念到底，标点不停顿、全程一个调。
//    这里切成一句句读，句间留停顿，并按句末标点微调语速/音调，听起来更像人说话。

export type SpeechLang = 'zh-CN' | 'en-US';

export interface SpeechSettings {
  /** 指定语音的 voiceURI；null = 自动挑最好的 */
  zhVoice: string | null;
  enVoice: string | null;
  /** 语速 0.5 ~ 1.6 */
  rate: number;
  /** 音调 0.5 ~ 1.6 */
  pitch: number;
}

const STORAGE_KEY = 'openedu:speech_settings';

const DEFAULT_SETTINGS: SpeechSettings = {
  zhVoice: null,
  enVoice: null,
  rate: 0.9,
  pitch: 1,
};

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// ── 设置 ────────────────────────────────────────────────────────────

export function loadSpeechSettings(): SpeechSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SpeechSettings>;
    return {
      zhVoice: typeof parsed.zhVoice === 'string' ? parsed.zhVoice : null,
      enVoice: typeof parsed.enVoice === 'string' ? parsed.enVoice : null,
      rate: typeof parsed.rate === 'number' ? clamp(parsed.rate, 0.5, 1.6) : DEFAULT_SETTINGS.rate,
      pitch: typeof parsed.pitch === 'number' ? clamp(parsed.pitch, 0.5, 1.6) : DEFAULT_SETTINGS.pitch,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSpeechSettings(next: Partial<SpeechSettings>): SpeechSettings {
  const merged = { ...loadSpeechSettings(), ...next };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* 隐私模式下写不进去也不影响朗读 */
  }
  return merged;
}

// ── 语音列表 ─────────────────────────────────────────────────────────

let voicesCache: SpeechSynthesisVoice[] = [];

function readVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported) return [];
  const v = window.speechSynthesis.getVoices();
  if (v && v.length) voicesCache = v;
  return voicesCache;
}

/** 语音是异步加载的，第一次调用时常常是空数组 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported) return Promise.resolve([]);
  const now = readVoices();
  if (now.length) return Promise.resolve(now);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
      resolve(readVoices());
    };
    const onChange = () => finish();
    window.speechSynthesis.addEventListener('voiceschanged', onChange);
    window.setTimeout(finish, 3000);
  });
}

// 神经网络音色（明显更像真人）> 现代音色 > 老合成音
const ZH_PREFERRED = [
  'xiaoxiao', 'yunxi', 'yunyang', 'xiaoyi', 'yunxia', 'xiaohan', // 微软神经网络/在线自然语音
  '晓晓', '云希', '云扬', '晓伊',
  'yaoyao', 'yaoyao', 'kangkang', // Windows 自带的现代中文音色
  'huihui', // 最老的一个，兜底
];
const EN_PREFERRED = ['aria', 'jenny', 'guy', 'sara', 'libby', 'sonia', 'ryan', 'natural', 'zira', 'david', 'hazel'];

function scoreVoice(voice: SpeechSynthesisVoice, lang: SpeechLang): number {
  const name = voice.name.toLowerCase();
  const vLang = voice.lang.toLowerCase();
  const base = lang.slice(0, 2).toLowerCase();
  if (!vLang.startsWith(base)) return -1;

  let score = 0;
  if (vLang === lang.toLowerCase()) score += 20;
  if (/online|natural|neural|神经|自然/.test(name)) score += 60;
  // 本地音色大幅加分，必须盖过上面所有加项（在线最高 130，本地最低 170）。
  //
  // 原因：在线（Natural）音色在 Chrome 里经常静默失败 —— 不报错、不回调，
  // 就是不出声，用户只看到「没声音」。同一台机器实测：
  //   本地 Huihui  开口 401ms，正常出声
  //   在线 晓晓     点了没反应
  // 稳定比音质重要，宁可要一个一定出声的本地音色。
  if (voice.localService) score += 150;

  const list = lang === 'zh-CN' ? ZH_PREFERRED : EN_PREFERRED;
  const idx = list.findIndex((k) => name.includes(k));
  if (idx >= 0) score += Math.max(0, 50 - idx * 4);

  return score;
}

/** 该语言可用的语音，按推荐程度排序 */
export function listVoicesFor(lang: SpeechLang): SpeechSynthesisVoice[] {
  const all = readVoices();
  if (!all.length) return [];
  return all
    .filter((v) => scoreVoice(v, lang) >= 0)
    .sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang));
}

export function pickVoice(lang: SpeechLang): SpeechSynthesisVoice | null {
  const settings = loadSpeechSettings();
  const wanted = lang === 'zh-CN' ? settings.zhVoice : settings.enVoice;
  const all = readVoices();
  if (wanted) {
    const hit = all.find((v) => v.voiceURI === wanted);
    if (hit) return hit;
  }
  return listVoicesFor(lang)[0] ?? null;
}

/** 给单个 utterance 套上「选好的语音 + 用户设置的语速音调」 */
export function applyVoiceSettings(utterance: SpeechSynthesisUtterance, lang: SpeechLang): void {
  utterance.lang = lang;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  const s = loadSpeechSettings();
  utterance.rate = clamp(s.rate, 0.5, 1.6);
  utterance.pitch = clamp(s.pitch, 0.5, 1.6);
}

// ── 切句 ────────────────────────────────────────────────────────────

/**
 * 按句切分，保留句末标点。
 * 保留标点很关键：切分结果拼接回来必须和原文逐字一致，
 * 否则算出的句首 charIndex 会偏移，高亮就对不上正在读的那句。
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？；.!?;])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const MAX_CHUNK = 70;
/** 短于这个长度的片段并到前一片，减少换片的次数 */
const MIN_CHUNK = 16;

/** 在句子基础上再把超长句按逗号切开，好让引擎有换气的地方 */
export function chunkText(text: string): string[] {
  const out: string[] = [];
  for (const sentence of splitSentences(text)) {
    if (sentence.length <= MAX_CHUNK) {
      out.push(sentence);
      continue;
    }
    const pieces = sentence
      .split(/(?<=[，,、])/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (pieces.length <= 1) {
      out.push(sentence);
      continue;
    }
    let buf = '';
    for (const piece of pieces) {
      if (buf && (buf + piece).length > MAX_CHUNK) {
        out.push(buf);
        buf = piece;
      } else {
        buf += piece;
      }
    }
    if (buf) out.push(buf);
  }

  const raw = out.length ? out : [text];

  // 「是你呀？」「再看这里。」这种十来个字的短句如果自己单独成一片，
  // 引擎换片时要空一下，听起来就是一顿一顿的。短片并到前一片里一起念。
  const merged: string[] = [];
  for (const piece of raw) {
    if (merged.length && piece.length < MIN_CHUNK) merged[merged.length - 1] += piece;
    else merged.push(piece);
  }
  return merged;
}

// ── 朗读 ────────────────────────────────────────────────────────────

export interface SpeakOptions {
  text: string;
  lang: SpeechLang;
  /**
   * 本次朗读单独用的语速，不传就用设置里的值。
   * 「慢速重听」这类场景要压低语速，但不该顺手改掉用户的全局设置。
   */
  rate?: number;
  /** 读到原文中第几个字了（绝对下标，可直接用来做高亮） */
  onBoundary?: (absCharIndex: number) => void;
  onStart?: () => void;
  /**
   * 朗读失败时回调。
   * 引擎最常见的坏法是「静默失败」——不报错、不回调，就是不出声。
   * 所以光靠 onerror 抓不到，得由 speak() 自己盯着有没有真的开口。
   */
  onError?: (reason: string) => void;
  /** 读完、出错或被取消时都会调用一次 */
  onEnd?: () => void;
}

export interface SpeakHandle {
  cancel(): void;
  pause(): void;
  resume(): void;
}

/**
 * cancel() 之后要隔多久才能安全地 speak()。
 * 见 speak() 里的说明：同一轮任务里 cancel + speak 会被 Chromium 静默吞掉。
 */
const SPEAK_START_DELAY_MS = 50;

/**
 * 送进引擎后多久还没开口就算失败。
 * 正常情况几百毫秒内一定会有 onstart，静默失败则是永远没有。
 */
const SPEAK_WATCHDOG_MS = 2500;

let seq = 0;
let active: { token: number; cancel: () => void } | null = null;

/**
 * 超过这个长度才切成多片来读。
 *
 * 实测（48 字的两句话，Yaoyao 音色）：
 *   单个 utterance 一口气念完   11578ms，中间无停顿
 *   切成两片，排队交给引擎     12060ms，中间空 470ms
 *   切成两片，setTimeout 串起来 12236ms，中间空 648ms
 * 每多切一片就要多付半秒上下的引擎切换开销，听起来就是一顿一顿的。
 * 而且单 utterance 并不容易截断：74 字的最长正文念了 15.1 秒，boundary 走到
 * 第 72 个字，是完整的。所以能一口气念完的就不切。
 * 知识库 960 条里最长的一条 74 字，全部落在「不切」这边；
 * 少儿百科那种 300 多字的长文才需要切。
 */
const MAX_SINGLE_LENGTH: Record<SpeechLang, number> = { 'zh-CN': 80, 'en-US': 260 };

/**
 * 中文正文里混了半角标点时，引擎往往不停顿。转回全角，让它在该停的地方停。
 * 全是单字符替换，替换前后长度一致，高亮用的 charIndex 不会错位。
 */
function normalizePunctuation(text: string, lang: SpeechLang): string {
  if (lang !== 'zh-CN') return text;
  return text
    .replace(/,/g, '，')
    .replace(/;/g, '；')
    .replace(/:/g, '：')
    .replace(/!/g, '！')
    .replace(/\?/g, '？');
}

/** 停掉正在进行的朗读 */
export function stopAllSpeech(): void {
  if (!speechSupported) return;
  const synth = window.speechSynthesis;
  // 没东西在播就不要 cancel：实测白 cancel 一次，下一次朗读的头一个字要等
  // 691ms 才出来，不 cancel 只要 405ms。差别近一半，就是「点了半天没动静」的来源。
  if (!active && !synth.speaking && !synth.pending) return;
  if (active) {
    active.cancel();
    return;
  }
  synth.cancel();
}

export function speak(options: SpeakOptions): SpeakHandle {
  const noop: SpeakHandle = { cancel() {}, pause() {}, resume() {} };
  if (!speechSupported || !options.text) return noop;

  stopAllSpeech();

  const synth = window.speechSynthesis;
  const token = ++seq;
  const lang = options.lang;
  const text = normalizePunctuation(options.text, lang);
  const chunks = text.length > MAX_SINGLE_LENGTH[lang] ? chunkText(text) : [text];
  const settings = loadSpeechSettings();
  const voice = pickVoice(lang);

  // 每片在原文中的起始下标（只有一片时就是 0）
  const starts: number[] = [];
  let acc = 0;
  for (const c of chunks) {
    starts.push(acc);
    acc += c.length;
  }

  let finished = false;
  let ended = 0;
  /** 还没送到引擎就被取消（定时器还没来得及触发） */
  let cancelled = false;
  let startTimer = 0;
  let watchdog = 0;
  /** 引擎到底有没有真的开口，用来区分「念完了」和「根本没念」 */
  let started = false;
  /** 已经用「不要指定音色」的方式重试过一次了 */
  let retried = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    if (watchdog) {
      window.clearTimeout(watchdog);
      watchdog = 0;
    }
    if (active?.token === token) active = null;
    options.onEnd?.();
  };

  const handle: SpeakHandle = {
    cancel() {
      // 可能还没送进引擎就被叫停了，把排队的那次也撤掉，别让它稍后再开口
      cancelled = true;
      if (startTimer) window.clearTimeout(startTimer);
      startTimer = 0;
      synth.cancel();
      finish();
    },
    pause() {
      if (!finished) synth.pause();
    },
    resume() {
      if (!finished) synth.resume();
    },
  };

  active = { token, cancel: handle.cancel };

  // 语速、音色在一批里是固定的，提到循环外面算一次就够。
  // 别放在 forEach 里面：那里一旦出现在 utterance.rate = rate 之后，
  // 就踩了暂时性死区（TDZ），每次朗读都会当场抛 ReferenceError。
  const rate = clamp(options.rate ?? settings.rate, 0.5, 1.6);
  const pitch = clamp(settings.pitch, 0.5, 1.6);

  // 分片时一次性全部排进队列，交给引擎顺序播放。
  // 早先是一片念完再 setTimeout 送下一片，那样片间还要多付约 180ms 的计时器 + 重建开销。
  // Chromium 的老毛病：cancel() 之后在同一个任务里紧接着 speak()，
  // 这条 utterance 会被静默吞掉 —— 不报错、不回调，就是没声音。
  // 上一次朗读只要还没正常收尾，stopAllSpeech() 就会走 cancel 那条路，
  // 于是从第二次开始全军覆没。隔开一个 tick 再送，跟 speakOnce 是同一套绕法。
  startTimer = window.setTimeout(() => {
    if (cancelled || finished) return;
    startTimer = 0;
    // 引擎可能停在上一次 pause() 的状态里（别的模块 pause 过没 resume），
    // 那个状态下 speak() 是彻底不出声的
    if (synth.paused) synth.resume();

    const speakChunks = (useVoice: SpeechSynthesisVoice | null) => {
      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = lang;
        if (useVoice) utterance.voice = useVoice;
        utterance.rate = rate;
        utterance.pitch = pitch;

        utterance.onstart = () => {
          started = true;
          if (index === 0) options.onStart?.();
        };
        utterance.onboundary = (event) => {
          if (event.name !== 'word' && event.name !== 'sentence') return;
          options.onBoundary?.(starts[index] + event.charIndex);
        };
        utterance.onend = () => {
          ended += 1;
          if (ended >= chunks.length) finish();
        };
        utterance.onerror = (event) => {
          options.onError?.((event as SpeechSynthesisErrorEvent).error || 'error');
          finish();
        };

        synth.speak(utterance);
      });
    };

    const armWatchdog = () => {
      watchdog = window.setTimeout(() => {
        if (cancelled || finished || started) return;
        // 选中的音色开不了口：退回系统默认音色再试一次。
        // 自检页证明「不指定音色」一定出声（系统会挑本地默认音色），
        // 所以这是最后一道保险，能兜住任何音色层面的坑。
        if (voice && !retried) {
          retried = true;
          synth.cancel();
          options.onError?.('no-start-retry-default');
          speakChunks(null);
          armWatchdog();
          return;
        }
        options.onError?.('no-start');
        finish();
      }, SPEAK_WATCHDOG_MS);
    };

    speakChunks(voice);
    armWatchdog();
  }, SPEAK_START_DELAY_MS);

  return handle;
}

/** 读一句短文本（单词、标题等），自带防 Chromium 假死的延时 */
export function speakOnce(text: string | undefined, lang: SpeechLang): void {
  if (!speechSupported || !text) return;
  stopAllSpeech();
  window.setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    applyVoiceSettings(utterance, lang);
    window.speechSynthesis.speak(utterance);
  }, 50);
}

// 进页面先把语音列表拉好，避免第一次点朗读时还没加载完、只能退回默认音色
if (speechSupported) {
  void loadVoices();
}
