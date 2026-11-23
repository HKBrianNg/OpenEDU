// client/src/books/KnowledgeBase/hooks/useSentenceSpeech.ts
// 朗读 hook：优先播放 VoiceAdmin 预生成的 mp3（微软 neural 音色，音质远好于
// Windows 本地语音），文件不存在（还没生成 / 走 CDN 也 404）时自动回退
// Web Speech API 逐句合成。
// mp3 是整段一条、没有 onboundary，所以 mp3 模式整块高亮；回退 TTS 时才逐句高亮。

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  speechSupported,
  speak,
  splitSentences,
  type SpeakHandle,
  type SpeechLang,
} from '../../../../utils/speech';

export type { SpeechLang };
export { splitSentences };

export function useSentenceSpeech() {
  const supported = speechSupported;

  const [sentences, setSentences] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [speakingLang, setSpeakingLang] = useState<SpeechLang | null>(null);
  // 记住正在读的是「哪一段文字」：标题和正文都可能要读，
  // 只记语言的话，点标题时正文会拿标题的句子去做高亮
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const handleRef = useRef<SpeakHandle | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeakingLang(null);
    setSpeakingText(null);
    setSentences([]);
    setActiveIndex(-1);
  }, []);

  /** 回退路径：Web Speech 逐句合成 + 高亮 */
  const startTts = useCallback((text: string, lang: SpeechLang) => {
    const parts = splitSentences(text);
    // 每句在原文中的起始下标
    const starts: number[] = [];
    let acc = 0;
    for (const s of parts) {
      starts.push(acc);
      acc += s.length;
    }

    setSentences(parts);
    setActiveIndex(0);

    handleRef.current = speak({
      text,
      lang,
      onBoundary: (absIndex) => {
        let idx = 0;
        for (let i = 0; i < starts.length; i++) {
          if (absIndex >= starts[i]) idx = i;
          else break;
        }
        setActiveIndex(idx);
      },
      onEnd: () => {
        handleRef.current = null;
        setActiveIndex(-1);
        setSpeakingLang(null);
        setSpeakingText(null);
      },
    });
  }, []);

  /** 同一段文字再点一次 = 停止；点另一段（哪怕同语言）= 切换 */
  const toggle = useCallback(
    (text: string, lang: SpeechLang, audioUrl?: string) => {
      if (!supported || !text) return;
      if (speakingLang === lang && speakingText === text) {
        stop();
        return;
      }

      handleRef.current?.cancel();
      handleRef.current = null;
      audioRef.current?.pause();
      audioRef.current = null;

      setSpeakingLang(lang);
      setSpeakingText(text);
      // 先清空句子：mp3 模式整块直出，回退 TTS 后再填句子逐句高亮
      setSentences([]);
      setActiveIndex(-1);

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        // 404 / 解码失败 / play() 被拒 → 只触发一次回退，别和 ended 重复
        let settled = false;
        const toTts = () => {
          if (settled) return;
          settled = true;
          audioRef.current = null;
          startTts(text, lang);
        };
        audio.addEventListener('error', toTts, { once: true });
        audio.addEventListener('ended', () => {
          if (settled) return;
          settled = true;
          audioRef.current = null;
          setSpeakingLang(null);
          setSpeakingText(null);
        }, { once: true });
        audio.play().catch(toTts);
        return;
      }

      startTts(text, lang);
    },
    [speakingLang, speakingText, stop, startTts, supported],
  );

  // 卸载时收尾，避免朗读在离开页面后继续响
  useEffect(() => {
    return () => {
      handleRef.current?.cancel();
      handleRef.current = null;
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  return { supported, sentences, activeIndex, speakingLang, speakingText, toggle, stop };
}
