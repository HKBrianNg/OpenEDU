import { useCallback, useEffect, useState } from 'react';
import { api } from '../../utils/request';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { useAuth } from '../AuthContext';

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

// 模块级：并发去重。React.StrictMode（dev）会双调 effect，
// 或任意两个组件同时挂载时，两次 refresh 必须共享同一个在飞请求，
// 否则缓存还没写入就各发一次（这正是日志里出现两条 GET 的原因）。
let inflightFetch: Promise<RefreshResult> | null = null;

async function fetchOnce(): Promise<RefreshResult> {
  try {
    const res = await api.get<PrefResponse>('/api/preferences');
    if (res.ok) {
      const next = res.data.data ?? null;
      writeCache(next);
      return { ok: true, data: next || undefined };
    }
    return { ok: false, message: res.data?.message || 'fetchFailed' };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || 'networkError' };
  } finally {
    inflightFetch = null;
  }
}

export function usePreferences(options: UsePreferencesOptions = {}) {
  const { autoLoad = true } = options;
  const { isAuthenticated } = useAuth();
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
    // 并发调用共享同一个请求，避免 StrictMode 双 effect 各发一次
    if (!inflightFetch) {
      inflightFetch = fetchOnce();
    }
    try {
      const result = await inflightFetch;
      if (result.ok && result.data) {
        setData(result.data);
      } else if (!result.ok) {
        setError(result.message || 'fetchFailed');
      }
      return result;
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
    // 只在登录后拉取（未登录不发请求）；已有缓存时 refresh 直接读缓存
    if (autoLoad && isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh();
    }
  }, [refresh, autoLoad, isAuthenticated]);

  return { data, loading, saving, error, refresh, save };
}