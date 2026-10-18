// client/src/books/KnowledgeBase/hooks/useKnowledgeIndex.ts
// 只加载 data.json（章节目录）。章节正文交给 useChapterItems 按需拉取，
// 首屏不再一次性把 8 个 content/*.json 全部打出去。

import { useEffect, useState } from 'react';
import { getCourseDataUrl } from '../../../utils/coursePath';
import { safeJsonFetch } from '../../../utils/safeFetch';
import type { KnowledgeIndex } from '../types';
import { COURSE_ID } from '../constants';

export function useKnowledgeIndex() {
  const [data, setData] = useState<KnowledgeIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 挂载时一次性加载索引：loading/error/data 是异步加载状态机的入口 */
    let cancelled = false;

    setLoading(true);
    setError(null);

    safeJsonFetch<KnowledgeIndex>(getCourseDataUrl(COURSE_ID))
      .then((json) => {
        if (cancelled) return;
        if (!json?.chapters?.length) {
          setError('知识库索引为空或格式不匹配');
          return;
        }
        setData(json);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '索引加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  return { data, loading, error };
}
