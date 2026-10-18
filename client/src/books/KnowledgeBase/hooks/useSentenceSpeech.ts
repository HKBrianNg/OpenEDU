// client/src/books/KnowledgeBase/hooks/useSentenceSpeech.ts
// 朗读 + 逐句高亮：把正文切成一句句读，靠 utterance.onboundary 的 charIndex 定位当前句。

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  speechSupported,
  speak,
  splitSentences,
  type SpeakHandle,
  type SpeechLang,
} from '../../../utils/speech';

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

  const stop = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
    setSpeakingLang(null);
    setSpeakingText(null);
    setActiveIndex(-1);
  }, []);

  /** 同一段文字再点一次 = 停止；点另一段（哪怕同语言）= 切换 */
  const toggle = useCallback(
    (text: string, lang: SpeechLang) => {
      if (!supported || !text) return;
      if (speakingLang === lang && speakingText === text) {
        stop();
        return;
      }

      handleRef.current?.cancel();

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
      setSpeakingLang(lang);
      setSpeakingText(text);

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
    },
    [speakingLang, speakingText, stop, supported],
  );

  // 卸载时收尾，避免朗读在离开页面后继续响
  useEffect(() => {
    return () => {
      handleRef.current?.cancel();
      handleRef.current = null;
    };
  }, []);

  return { supported, sentences, activeIndex, speakingLang, speakingText, toggle, stop };
}
