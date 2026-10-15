// client/src/store/hooks/usePreferences.ts
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../utils/request';

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
  // 首次挂载是否自动加载。AuthContext 用 false（手动在 login() 里调 refresh）
  autoLoad?: boolean;
}

export interface RefreshResult {
  ok: boolean;
  data?: Preferences;
  message?: string;
}

// 用户偏好设置：query + save 合并在同一个 hook
// query: 首次挂载自动加载（autoLoad: true），refresh() 可手动重拉并返回 data
// save: 更新（PATCH），返回 { ok, message }，由组件决定如何提示
export function usePreferences(options: UsePreferencesOptions = {}) {
  const { autoLoad = true } = options;
  const [data, setData] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<RefreshResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PrefResponse>('/api/preferences');
      if (res.ok) {
        const next = res.data.data ?? null;
        setData(next);
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
      // 首次挂载时自动加载：用 hook 的 refresh() 复用同一份加载/错误处理逻辑；
      // 这里 setState 是异步副作用的连锁更新（loading → data → loading=false），
      // 不是渲染期的同步状态写入，所以可以接受
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh();
    }
  }, [refresh, autoLoad]);

  return { data, loading, saving, error, refresh, save };
}
