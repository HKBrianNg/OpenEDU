// 歌词加载 hook：按 URL 拉取 LRC 文本并解析为时间轴行

import { useEffect, useState } from 'react';
import { parseLRC, type LyricLine } from './lyrics';

export function useLyrics(lyricUrl: string | undefined) {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- URL 变化是外部状态变化；这里用 effect 把内部状态同步到「清空/重新加载」 */
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
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [lyricUrl]);

  return { lines, loading };
}
