// desktop/src/pages/admin/SongsAdmin/hooks/songHooks.ts

import { useState, useCallback } from 'react';
import type { CourseId, SearchSongItem, PreviewState } from '../songTypes';

export function useSongSearch(_courseId: CourseId) {
  const [results, setResults] = useState<SearchSongItem[]>([]);
  const [singers, setSingers] = useState<{ name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (keyword: string) => {
      setLoading(true);
      try {
        // 只传 keyword，courseId 留着占位（以后可按课程过滤）
        const res = await window.ipcRenderer?.invoke('songs:search', keyword);
        setResults(res?.songs ?? []);
        setSingers(res?.singers ?? []);
      } catch (err) {
        console.error('[useSongSearch]', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [] // _courseId 没用到，从依赖里移除
  );

  return { results, singers, search, loading };
}

export function useSongPreview() {
  const [detail, setDetail] = useState<PreviewState | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async (songId: string) => {
    setLoading(true);
    try {
      const res = await window.ipcRenderer?.invoke('songs:detail', { songId });
      setDetail(res ?? null);
    } catch (err) {
      console.error('[useSongPreview]', err);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { detail, loading, fetchDetail };
}

export function useSongImport() {
  const [loading, setLoading] = useState(false);

  const importSong = useCallback(
    async (
      item: SearchSongItem,
      courseId: CourseId,
      category: string
    ) => {
      setLoading(true);
      try {
        const res = await window.ipcRenderer?.invoke('songs:import', {
          song: item,
          courseId,
          category,
        });
        return res; // 透传主进程返回结果
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { importSong, loading };
}