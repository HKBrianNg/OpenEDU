// client/src/books/KnowledgeBase/hooks/useSentenceSpeech.ts
// 朗读 + 逐句高亮：把正文按句切分，靠 utterance.onboundary 的 charIndex 定位当前句。

import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechLang = 'zh-CN' | 'en-US';

/**
 * 按句切分，保留句末标点。
 * 保留标点很关键：切分结果拼接回来必须和原文逐字一致，
 * 否则下面算出的句首 charIndex 会偏移，高亮就对不上正在读的那句。
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？；.!?;])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function useSentenceSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [sentences, setSentences] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [speakingLang, setSpeakingLang] = useState<SpeechLang | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeakingLang(null);
    setActiveIndex(-1);
  }, [supported]);

  /** 同一语言再点一次 = 停止；点另一种语言 = 切换 */
  const toggle = useCallback(
    (text: string, lang: SpeechLang) => {
      if (!supported || !text) return;
      if (speakingLang === lang) {
        stop();
        return;
      }

      window.speechSynthesis.cancel();

      const parts = splitSentences(text);
      // 每句在原文中的起始下标
      const starts: number[] = [];
      let acc = 0;
      for (const s of parts) {
        starts.push(acc);
        acc += s.length;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.85;

      utterance.onboundary = (event) => {
        if (event.name !== 'word' && event.name !== 'sentence') return;
        let idx = 0;
        for (let i = 0; i < starts.length; i++) {
          if (event.charIndex >= starts[i]) idx = i;
          else break;
        }
        setActiveIndex(idx);
      };

      // 只认「当前这一条」的结束回调：切到另一条/换题时，旧的 onend 会晚到，
      // 不去重的话会把刚开始的新朗读状态清掉
      const done = () => {
        if (utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        setSpeakingLang(null);
        setActiveIndex(-1);
      };
      utterance.onend = done;
      utterance.onerror = done;

      utteranceRef.current = utterance;
      setSentences(parts);
      setActiveIndex(0);
      setSpeakingLang(lang);
      window.speechSynthesis.speak(utterance);
    },
    [speakingLang, stop, supported],
  );

  // 卸载时收尾，避免朗读在离开页面后继续响
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  return { supported, sentences, activeIndex, speakingLang, toggle, stop };
}
