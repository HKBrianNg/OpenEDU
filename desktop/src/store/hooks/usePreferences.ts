import { useCallback, useEffect, useState } from 'react';
import { api } from '../../utils/request';
import { storage, STORAGE_KEYS } from '../../utils/storage';

export interface Preferences {
  theme: string;
  language: string;
  notifications: { email: boolean; push: boolean; sms: boolean };
  privacy: { profile_public: boolean; show_email: boolean };
}

interface PrefResponse {
  code: string;
  message?: string;
  data?: Preferences;
}

export interface UsePreferencesOptions {
  autoLoad?: boolean;
}

export interface RefreshResult {
  ok: boolean;
  data?: Preferences;
  message?: string;
}

// ─── localStorage 缓存：login 后拿一次，之后全走缓存 ───

function readCache(): Preferences | null {
  return storage.get<Preferences>(STORAGE_KEYS.preferences);
}

function writeCache(value: Preferences | null) {
  if (value == null) {
    storage.remove(STORAGE_KEYS.preferences);
  } else {
    storage.set(STORAGE_KEYS.preferences, value);
  }
}

export function usePreferences(options: UsePreferencesOptions = {}) {
  const { autoLoad = true } = options;
  // 初值直接读缓存，避免 mount 时先渲染 null 再等 API
  const [data, setData] = useState<Preferences | null>(() => readCache());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false): Promise<RefreshResult> => {
    // 有缓存且非强制 → 不打 API，直接用缓存（应用生命周期内只拉一次）
    if (!force) {
      const cached = readCache();
      if (cached) {
        setData(cached);
        return { ok: true, data: cached };
      }
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PrefResponse>('/api/preferences');
      if (res.ok) {
        const next = res.data.data ?? null;
        setData(next);
        writeCache(next);
        return { ok: true, data: next || undefined };
      }
      setError(res.data?.message || 'fetchFailed');
      return { ok: false, message: res.data?.message };
    } catch (e) {
      const msg = (e as Error)?.message || 'networkError';
      setError(msg);
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(
    async (values: Preferences): Promise<{ ok: boolean; message?: string }> => {
      setSaving(true);
      setError(null);
      try {
        const res = await api.patch<PrefResponse>('/api/preferences', values);
        if (res.ok) {
          setData(values);
          writeCache(values);
          return { ok: true, message: res.data?.message };
        }
        setError(res.data?.message || 'updateFailed');
        return { ok: false, message: res.data?.message };
      } catch (e) {
        const msg = (e as Error)?.message || 'networkError';
        setError(msg);
        return { ok: false, message: msg };
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (autoLoad) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh();
    }
  }, [refresh, autoLoad]);

  return { data, loading, saving, error, refresh, save };
}