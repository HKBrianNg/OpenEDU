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
  autoLoad?: boolean;
}

export interface RefreshResult {
  ok: boolean;
  data?: Preferences;
  message?: string;
}

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh();
    }
  }, [refresh, autoLoad]);

  return { data, loading, saving, error, refresh, save };
}