// desktop/src/pages/SportVideo/hooks/useSportVideo.ts
import { useEffect, useState } from 'react';
import { getCourseDataUrl, getCourseBaseUrl } from '../../../../utils/coursePath';
import type { SportIndexData, SportCategoryData, SportItem } from '../types';

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return m ? m[1] : null;
}

async function tryFetchJson(url: string): Promise<unknown> {
  console.log('[SportVideo] Fetch:', url);
  const res = await fetch(url);
  console.log('[SportVideo] Status:', res.status);
  const text = await res.text();
  console.log('[SportVideo] Response preview:', text.slice(0, 300));

  if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
    throw new Error('Received HTML instead of JSON (Vite fallback / missing file)');
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return JSON.parse(text);
}

function getSportVideoChapterUrl(contentLink: string): string {
  const baseName = contentLink.replace(/\.json$/i, '');
  const base = getCourseBaseUrl('SportsVideo');
  const rawUrl = `${base}/${encodeURIComponent(baseName)}/${encodeURIComponent(baseName)}.json`;

  const USE_LOCAL_DATA = import.meta.env.VITE_USE_LOCAL_DATA === 'true';
  const DATA_VERSION = import.meta.env.VITE_DATA_VERSION || '1';
  if (USE_LOCAL_DATA) return rawUrl;
  const sep = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${sep}v=${DATA_VERSION}`;
}

export function useSportVideo() {
  const [indexData, setIndexData] = useState<SportIndexData | null>(null);
  const [category, setCategory] = useState<SportCategoryData | null>(null);
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchItem, setWatchItem] = useState<SportItem | null>(null);

  // 加载 index
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const indexUrl = getCourseDataUrl('SportsVideo');

    tryFetchJson(indexUrl)
      .then((data) => {
        if (cancelled) return;
        setIndexData(data as SportIndexData);
        const first = (data as SportIndexData).chapters?.[0];
        if (first) setCurrentChapter(first.contentLink);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // 加载 chapter
  useEffect(() => {
    if (!currentChapter) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const contentUrl = getSportVideoChapterUrl(currentChapter);

    tryFetchJson(contentUrl)
      .then((payload) => {
        if (cancelled) return;
        setCategory(payload as SportCategoryData);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(`${contentUrl} | ${String(err)}`);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [currentChapter]);

  return {
    indexData,
    category,
    currentChapter,
    setCurrentChapter,
    loading,
    error,
    watchItem,
    setWatchItem,
    extractYoutubeId,
  };
}