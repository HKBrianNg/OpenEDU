// desktop/src/pages/admin/SongsAdmin/hooks/songHooks.ts
import { useState, useCallback } from 'react';
import type { CourseId, SearchSongItem, PreviewState } from '../songTypes';

function getIpc() {
  const ipc = (window as any).ipcRenderer;
  if (!ipc?.invoke) {
    throw new Error('IPC 桥未注入：请确认从 Electron 启动，且 preload.ts 已挂载');
  }
  return ipc;
}

export function useSongSearch(_courseId: CourseId) {
  const [results, setResults] = useState<SearchSongItem[]>([]);
  const [singers, setSingers] = useState<{ name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (keyword: string) => {
    const kw = (keyword ?? '').trim();
    if (!kw) {
      setResults([]);
      setSingers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getIpc().invoke('songs:search', kw);
      setResults(res?.songs ?? []);
      setSingers(res?.singers ?? []);
    } catch (err) {
      console.error('[useSongSearch]', err);
      setResults([]);
      setSingers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, singers, search, loading };
}

export function useSongPreview() {
  const [detail, setDetail] = useState<PreviewState | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async (
    courseId: string,
    songId: string,
    name?: string,
    artist?: string
  ) => {
    setLoading(true);
    try {
      const result = await getIpc().invoke('songs:detail', {
        courseId,
        songId,
        name: name || '',
        artist: artist || '',
      });
      setDetail(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return { detail, loading, fetchDetail };
}

export interface ImportOverride {
  audioUrl?: string;
  lyrics?: string;
}

export function useSongImport() {
  const [loading, setLoading] = useState(false);

  const importSong = useCallback(
    async (
      item: SearchSongItem,
      courseId: string,
      category: string,
      override?: ImportOverride
    ) => {
      setLoading(true);
      try {
        return await getIpc().invoke('songs:import', {
          song: item,
          courseId,
          category,
          audioUrl: override?.audioUrl || '',
          lyrics: override?.lyrics || '',
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { importSong, loading };
}