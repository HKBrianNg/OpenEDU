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

// 用户偏好设置：query + save 合并在同一个 hook
// query: 首次挂载自动加载，refresh() 可手动重拉
// save: 更新（PATCH），返回 { ok, message }，由组件决定如何提示
export function usePreferences() {
  const [data, setData] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PrefResponse>('/api/preferences');
      if (res.ok) {
        setData(res.data.data ?? null);
      } else {
        setError(res.data?.message || 'fetchFailed');
      }
    } catch (e) {
      setError((e as Error)?.message || 'networkError');
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
    refresh();
  }, [refresh]);

  return { data, loading, saving, error, refresh, save };
}
