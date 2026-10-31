import { useEffect, useRef } from 'react';

/**
 * 预加载音频文件到浏览器缓存
 * @param urls - 音频 URL 列表
 * @param maxConcurrent - 最大并发加载数，默认 3
 * @param enabled - 是否启用，默认 true
 */
export function usePreloadAudio(
  urls: string[],
  maxConcurrent = 3,
  enabled = true,
) {
  // 用 ref 记录已加载过的 URL，避免重复加载
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || urls.length === 0) return;

    let cancelled = false;
    let activeCount = 0;
    let cursor = 0;

    function loadNext() {
      if (cancelled) return;

      // 填满并发槽
      while (activeCount < maxConcurrent && cursor < urls.length) {
        const url = urls[cursor++];

        // 已经加载过就跳过
        if (loadedRef.current.has(url)) {
          continue;
        }

        activeCount++;
        loadedRef.current.add(url);

        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = url;

        // 关键：调用 load() 触发浏览器发起请求并缓存
        audio.load();

        const onDone = () => {
          activeCount--;
          if (!cancelled) loadNext();
        };

        audio.addEventListener('canplaythrough', onDone, { once: true });
        audio.addEventListener('error', onDone, { once: true });
      }
    }

    loadNext();

    return () => {
      cancelled = true;
    };
  }, [urls, maxConcurrent, enabled]);
}