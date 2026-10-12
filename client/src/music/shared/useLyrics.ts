// 歌词加载 hook：按 URL 拉取 LRC 文本并解析为时间轴行

import { useEffect, useState } from 'react';
import { parseLRC, type LyricLine } from './lyrics';

export function useLyrics(lyricUrl: string | undefined) {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLines([]);

    if (!lyricUrl) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(lyricUrl)
      .then((res) => res.text())
      .then((text) => {
        if (!cancelled) setLines(parseLRC(text));
      })
      .catch(() => {
        if (!cancelled) setLines([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lyricUrl]);

  return { lines, loading };
}
