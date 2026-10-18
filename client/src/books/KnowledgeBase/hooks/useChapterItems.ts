// client/src/books/KnowledgeBase/hooks/useChapterItems.ts
// 按需加载某一章的正文：只有真正打开该章时才发请求，并在模块级缓存结果，
// 从详情页返回画廊 / 再次进入同一章都不会重复请求。

import { useEffect, useState } from 'react';
import { getCourseAssetUrl } from '../../../utils/coursePath';
import { safeJsonFetch } from '../../../utils/safeFetch';
import type { KnowledgeChapter, KnowledgeItem } from '../types';
import { COURSE_ID } from '../constants';

/**
 * 注意：不能复用 getCourseContentUrl —— 它会自动补 .json，
 * 而本课程的 contentLink 已经带 .json（如 human-body.json），会拼成 human-body.json.json。
 */
function chapterUrl(contentLink: string): string {
  return getCourseAssetUrl(COURSE_ID, `content/${contentLink}`);
}

/** 模块级缓存：跨组件挂载复用，key 为 contentLink */
const cache = new Map<string, KnowledgeItem[]>();

/** 已缓存的章节条目数（用于章节卡片角标）；未加载过返回 null */
export function getCachedCount(contentLink: string): number | null {
  const hit = cache.get(contentLink);
  return hit ? hit.length : null;
}

export function useChapterItems(chapter: KnowledgeChapter | null) {
  const [items, setItems] = useState<KnowledgeItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 章节切换时按需拉取正文：loading/error/items 是这套异步状态机的入口 */
    if (!chapter) {
      setItems(null);
      return;
    }

    const link = chapter.contentLink;

    // 命中缓存：同步回填，不发请求
    const cached = cache.get(link);
    if (cached) {
      setItems(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setItems(null);

    safeJsonFetch<KnowledgeItem[]>(chapterUrl(link))
      .then((json) => {
        if (cancelled) return;
        const list = Array.isArray(json) ? json : [];
        cache.set(link, list);
        setItems(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '章节内容加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [chapter]);

  return { items, loading, error };
}
