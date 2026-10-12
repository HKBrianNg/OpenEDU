// client/src/dashboard/SongAdmin/hooks/useSongAdmin.ts
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../utils/request';
import { getCourseDataUrl } from '../../../utils/coursePath';
import { safeJsonFetch } from '../../../utils/safeFetch';
import type { SongsData } from '../../../music/shared/types';

interface SongDataResponse {
  code: string;
  message?: string;
  data?: SongsData;
}

// 读取云端歌曲目录：404（尚未初始化）时 notFound=true，由页面提供导入/新建入口
export function useSongData(courseId: string) {
  const [data, setData] = useState<SongsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await api.get<SongDataResponse>(
        `/api/admin/songs?courseId=${encodeURIComponent(courseId)}`,
      );
      if (res.ok && res.data.code === 'SONGS_RETRIEVED' && res.data.data) {
        setData(res.data.data);
      } else if (res.status === 404 || res.data.code === 'SONGS_NOT_FOUND') {
        setNotFound(true);
        setData(null);
      } else {
        setError(res.data?.message || 'fetchFailed');
      }
    } catch (e) {
      setError((e as Error)?.message || 'networkError');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, setData, loading, notFound, error, reload: load };
}

// 保存整份目录到云端（upsert）
export function useSaveSongData() {
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (courseId: string, data: SongsData): Promise<{ ok: boolean; message?: string }> => {
      setSaving(true);
      try {
        const res = await api.put<SongDataResponse>('/api/admin/songs', { courseId, data });
        const ok = res.ok && res.data.code === 'SONGS_SAVED';
        return { ok, message: res.data?.message };
      } catch (e) {
        return { ok: false, message: (e as Error)?.message || 'networkError' };
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { saving, save };
}

// 从 CDN 拉取线上 data.json（导入用；非后台 API，静态资源直读）
export async function fetchCatalogFromCDN(courseId: string): Promise<SongsData> {
  return safeJsonFetch<SongsData>(getCourseDataUrl(courseId));
}
