// desktop/src/utils/audioPlayback.ts
// 预生成 mp3 优先、浏览器 TTS 兜底的统一播放器。
// VoiceAdmin 生成的音频（audio/.audio 目录）音质远好于系统 TTS：
// 有 mp3 就直接播（playbackRate 支持「慢速重听」），404/加载失败自动回退 speak()。

import { speak, type SpeakHandle, type SpeechLang } from './speech';

export interface Mp3FirstOptions {
  /** mp3 地址；不传或为空直接走 TTS */
  url?: string;
  /** 回退 TTS 时朗读的文本 */
  text: string;
  lang: SpeechLang;
  /** mp3 播放速率（慢速模式传 0.62 之类）；TTS 语速仍由 speak() 的设置决定 */
  rate?: number;
  onStart?: () => void;
  /** mp3 播完或回退的 TTS 读完时回调一次 */
  onEnd?: () => void;
  /** 回退 TTS 后朗读失败时回调（如 TTS 静默失败的看门狗） */
  onError?: (reason: string) => void;
}

export function playMp3OrSpeak(options: Mp3FirstOptions): SpeakHandle {
  if (!options.url) {
    return speak({
      text: options.text,
      lang: options.lang,
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError,
    });
  }

  const audio = new Audio(options.url);
  if (options.rate && options.rate > 0) audio.playbackRate = options.rate;

  let handle: SpeakHandle | null = null;
  let fellBack = false;
  const fallback = () => {
    if (fellBack) return;
    fellBack = true;
    handle = speak({
      text: options.text,
      lang: options.lang,
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError,
    });
  };

  audio.onplaying = () => options.onStart?.();
  audio.onended = () => options.onEnd?.();
  audio.onerror = fallback;

  audio.play().catch(fallback);

  return {
    cancel() {
      if (fellBack) handle?.cancel();
      else {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
    },
    pause() {
      if (fellBack) handle?.pause();
      else audio.pause();
    },
    resume() {
      if (fellBack) handle?.resume();
      else audio.play().catch(() => {});
    },
  };
}
