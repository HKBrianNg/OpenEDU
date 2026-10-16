// client/src/dashboard/SongAdmin/hooks/useGequhaiImport.ts
//
// 从 gequhai.com 检索歌曲（经 worker 代理）。
// 浏览器直连会被 CORS + 站方的 cookie 挑战挡住，所以必须走 /api/admin/songs/* 。

import { useCallback, useState } from 'react';
import { api } from '../../../utils/request';

export interface GequhaiSong {
  id: string;
  title: string;
  artist: string;
}

export interface GequhaiSongDetail extends GequhaiSong {
  cover: string;
  /** 带 [mm:ss.xx] 时间戳的原始 LRC */
  lrc: string;
  /** 去掉时间戳的纯歌词 */
  plainLyrics: string;
  /**
   * 音频直链（酷我 CDN 带签名，有时效）。
   * 仅供后台试听预览 —— 不要存进 data.json，长期有效需自己转存文件。
   */
  audioUrl: string;
  /** /api/music 返回的 code：200 成功，430 无在线音源，403 访问异常（接口抖动） */
  audioCode: number | null;
  audioMsg: string;
}

interface SearchResponse {
  code: string;
  message?: string;
  data?: { singer: string; total: number; items: GequhaiSong[] };
}

interface DetailResponse {
  code: string;
  message?: string;
  data?: GequhaiSongDetail;
}

/**
 * 按歌手名搜索歌曲列表（on-demand：只有点搜索才发请求，不做自动加载）
 */
export function useGequhaiSearch() {
  const [items, setItems] = useState<GequhaiSong[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (singer: string): Promise<boolean> => {
    const q = singer.trim();
    if (!q) return false;

    setSearching(true);
    setError(null);
    try {
      const res = await api.get<SearchResponse>(
        `/api/admin/songs/gequhai-search?singer=${encodeURIComponent(q)}`,
      );
      if (res.ok && res.data.code === 'GEQUHAI_SEARCHED' && res.data.data) {
        setItems(res.data.data.items ?? []);
        return true;
      }
      setItems([]);
      setError(res.data?.message || 'searchFailed');
      return false;
    } catch (e) {
      setItems([]);
      setError((e as Error)?.message || 'networkError');
      return false;
    } finally {
      setSearching(false);
    }
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setError(null);
  }, []);

  return { items, searching, error, search, reset };
}

/**
 * 取单曲详情（含 LRC 歌词），用于预览
 */
export function useGequhaiSongDetail() {
  const [detail, setDetail] = useState<GequhaiSongDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (song: GequhaiSong): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const res = await api.get<DetailResponse>(
        `/api/admin/songs/gequhai-song?id=${encodeURIComponent(song.id)}`,
      );
      if (res.ok && res.data.code === 'GEQUHAI_SONG_RETRIEVED' && res.data.data) {
        // 列表里已有歌名/歌手，详情可能缺字段时用列表值兜底
        setDetail({
          ...res.data.data,
          title: res.data.data.title || song.title,
          artist: res.data.data.artist || song.artist,
        });
        return true;
      }
      setError(res.data?.message || 'lyricFailed');
      return false;
    } catch (e) {
      setError((e as Error)?.message || 'networkError');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setDetail(null);
    setError(null);
  }, []);

  return { detail, loading, error, load, clear };
}
