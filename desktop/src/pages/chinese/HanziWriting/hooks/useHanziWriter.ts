import HanziWriter from 'hanzi-writer';
import { useEffect, useRef } from 'react';
import { COLORS } from '../constants';
import { ensureStrokeData } from './useStrokeData';
import type { ScriptMode } from '../types';

interface UseHanziWriterParams {
  char: string;
  /** 这个字属于哪个年级 —— 用来知道去哪份数据里找它的笔画 */
  grade: number;
  /** 简体还是繁体：两套笔画数据分开装 */
  script: ScriptMode;
  size: number;
  /** 显示灰色轮廓 —— 笔顺演示和描红的底稿 */
  showOutline: boolean;
  /** 直接显示写好的字 */
  showCharacter: boolean;
  strokeAnimationSpeed: number;
  /** 这个数字一变就重建实例，用来把已经写上去的笔画擦干净 */
  resetKey?: number;
  /** 实例建好了、可以开始动画。切字和「重写一遍」都会重新走一次 */
  onReady?: (writer: HanziWriter) => void;
  /** 笔画数据没能加载出来 */
  onError?: () => void;
}

/**
 * 把一个 HanziWriter 实例挂到 containerRef 指到的 div 上。
 *
 * 笔画数据是打包在 data/strokes/gradeN.js 里的，不走网络，所以断网也能练；
 * 只是按年级分批，第一次用到某年级时要等那一坨数据解析出来。
 *
 * 实例本身放在 ref 里而不是 state 里：它只是个命令式的把手，
 * 放进 state 会让每次重建都多绕一轮渲染。
 */
export function useHanziWriter({
  char,
  grade,
  script,
  size,
  showOutline,
  showCharacter,
  strokeAnimationSpeed,
  resetKey = 0,
  onReady,
  onError,
}: UseHanziWriterParams) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);

  // 这两个回调每次渲染都是新函数，用 ref 转一道，免得塞进依赖里反复重建实例
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onReady, onError]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let instance: HanziWriter | null = null;

    // HanziWriter 每次 create 都往容器里塞一个新的 svg，重建前先清干净
    el.innerHTML = '';
    writerRef.current = null;

    ensureStrokeData(char, grade, script)
      .then((data) => {
        // 切字切得快的时候，旧字的加载可能后到，别让它覆盖新字
        if (cancelled) return;
        instance = HanziWriter.create(el, char, {
          width: size,
          height: size,
          padding: 12,
          showOutline,
          showCharacter,
          strokeAnimationSpeed,
          strokeColor: COLORS.stroke,
          outlineColor: COLORS.outline,
          drawingColor: COLORS.drawing,
          highlightColor: COLORS.highlight,
          // 娃用鼠标 / 手指头画，笔迹粗一点才看得清
          drawingWidth: 10,
          charDataLoader: (_c, onLoad) => onLoad(data),
        });
        writerRef.current = instance;
        onReadyRef.current?.(instance);
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      instance?.cancelQuiz();
      el.innerHTML = '';
      writerRef.current = null;
    };
  }, [char, grade, script, size, showOutline, showCharacter, strokeAnimationSpeed, resetKey]);

  return { containerRef, writerRef };
}
