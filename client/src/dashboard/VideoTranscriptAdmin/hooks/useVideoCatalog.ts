// 拉全量视频目录：EnglishVideo/data.json（年级表）+ 每个年级的 {Grade}.json（条目），
// 再逐个探测台词文件是否存在且非空 —— 这是本页要管的核心状态。
//
// 与前台「按需加载某年级」不同：管理页要一眼看到全部视频的台词进度。
// 探测请求会并发但限流，避免年级做大之后一次性打出几百个请求。

import { useEffect, useState } from 'react';
import { getCourseDataUrl, getCourseAssetUrl } from '../../../utils/coursePath';
import { safeJsonFetch } from '../../../utils/safeFetch';
import type { VideoRow } from '../types';

const COURSE_ID = 'EnglishVideo';

/** "Kingdergarten.json" → "Kingdergarten"（目录名就是去掉扩展名） */
const dirOf = (contentLink: string) => contentLink.replace(/\.json$/i, '');

interface Chapter {
  name: string;
  en: string;
  contentLink: string;
}

interface RawItem {
  id?: number;
  englishName?: string;
  chineseName?: string;
  url?: string;
  transcriptFile?: string;
}

/** 并发限流：同时最多 limit 个在飞 */
async function mapLimit<T, R>(
  arr: T[],
  limit: number,
  fn: (x: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < arr.length; i += limit) {
    const chunk = await Promise.all(arr.slice(i, i + limit).map(fn));
    out.push(...chunk);
  }
  return out;
}

/** 探测一个台词文件：不存在 / 空 lines 都算没有 */
async function probeTranscript(
  dir: string,
  file: string
): Promise<{ has: boolean; lines: number }> {
  if (!file) return { has: false, lines: 0 };
  try {
    const j = await safeJsonFetch<{ lines?: unknown[] }>(
      getCourseAssetUrl(COURSE_ID, `${dir}/${file}`)
    );
    const n = Array.isArray(j?.lines) ? j.lines.length : 0;
    return { has: n > 0, lines: n };
  } catch {
    return { has: false, lines: 0 };
  }
}

export function useVideoCatalog() {
  const [rows, setRows] = useState<VideoRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const index = await safeJsonFetch<{ chapters?: Chapter[] }>(
          getCourseDataUrl(COURSE_ID)
        );
        const chapters: Chapter[] = Array.isArray(index?.chapters)
          ? index.chapters
          : [];

        // 单年级失败不该让整页挂掉
        const files = await Promise.all(
          chapters.map((c) =>
            safeJsonFetch<{ items?: RawItem[] }>(
              getCourseAssetUrl(COURSE_ID, `${dirOf(c.contentLink)}/${c.contentLink}`)
            ).catch(() => ({ items: [] as RawItem[] }))
          )
        );
        if (cancelled) return;

        // 先把待探测的摊平，再统一限流并发
        type Pending = { row: VideoRow; dir: string; file: string };
        const pending: Pending[] = [];
        chapters.forEach((c, ci) => {
          const dir = dirOf(c.contentLink);
          (files[ci]?.items ?? []).forEach((it) => {
            const file = it.transcriptFile || '';
            pending.push({
              dir,
              file,
              row: {
                key: `${dir}#${it.id ?? 0}`,
                grade: dir,
                gradeName: c.name,
                id: it.id ?? 0,
                titleEn: it.englishName || '',
                titleZh: it.chineseName || '',
                url: it.url || '',
                transcriptFile: file,
                hasTranscript: false,
                lineCount: 0,
              },
            });
          });
        });

        const probed = await mapLimit(pending, 8, async (p) => {
          const r = await probeTranscript(p.dir, p.file);
          return { ...p.row, hasTranscript: r.has, lineCount: r.lines };
        });
        if (cancelled) return;

        setRows(probed);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载视频目录失败');
        }
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
