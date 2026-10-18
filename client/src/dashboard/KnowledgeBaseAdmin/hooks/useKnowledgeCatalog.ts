// 拉全量目录：data.json（章节表）+ 每章的 content/*.json（条目）。
// 与前台的按需加载不同 —— 这是管理页，需要一次性看到全部 192 条才能挑图，
// 16 个并发请求只在进入该卡片时发生一次。

import { useEffect, useState } from 'react';
import { getCourseDataUrl, getCourseAssetUrl } from '../../../utils/coursePath';
import { safeJsonFetch } from '../../../utils/safeFetch';
import { COURSE_ID, chapterTheme } from '../../../books/KnowledgeBase/constants';
import { itemIcon } from '../../../books/KnowledgeBase/itemIcons';
import type {
  KnowledgeChapter,
  KnowledgeIndex,
  KnowledgeItem,
} from '../../../books/KnowledgeBase/types';
import type { CatalogRow } from '../types';

function chapterUrl(contentLink: string): string {
  return getCourseAssetUrl(COURSE_ID, `content/${contentLink}`);
}

export function useKnowledgeCatalog() {
  const [rows, setRows] = useState<CatalogRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // 不在这里同步 setLoading/setError —— 初始 state 已是 loading=true / error=null，
    // 同步 setState 会触发级联渲染（eslint react-hooks/set-state-in-effect）
    void (async () => {
      try {
        const index = await safeJsonFetch<KnowledgeIndex>(getCourseDataUrl(COURSE_ID));
        const chapters: KnowledgeChapter[] = Array.isArray(index?.chapters) ? index.chapters : [];

        // 单章失败不该让整页挂掉：失败的章节按空数组处理
        const lists = await Promise.all(
          chapters.map((c) =>
            safeJsonFetch<KnowledgeItem[]>(chapterUrl(c.contentLink)).catch(
              () => [] as KnowledgeItem[]
            )
          )
        );
        if (cancelled) return;

        const out: CatalogRow[] = [];
        chapters.forEach((c, ci) => {
          const theme = chapterTheme(c.contentLink, ci);
          (lists[ci] ?? []).forEach((it, ii) => {
            const zh = it?.title?.zh ?? '';
            out.push({
              key: `${c.contentLink}#${ii}`,
              chapterName: c.name,
              chapterEn: c.en,
              chapterColor: theme.color,
              contentLink: c.contentLink,
              titleZh: zh,
              titleEn: it?.title?.en ?? '',
              icon: itemIcon(zh, theme.icon),
              imageUrl: it?.imageUrl,
              hasImage: Boolean(it?.imageUrl),
            });
          });
        });

        setRows(out);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载知识库目录失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, loading, error };
}
