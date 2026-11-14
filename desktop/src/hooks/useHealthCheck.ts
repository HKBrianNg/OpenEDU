import { useCallback, useState } from 'react';
import { api } from '../utils/request';

export interface HealthData {
  status: string;
  version: string;
  uptime?: number;
  timestamp?: string;
  [key: string]: unknown;
}

export function useHealthCheck() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<HealthData>('/api/health');
      if (res.ok) {
        setData(res.data);
      } else {
        setError((res.data as { message?: string })?.message || 'Health check failed');
      }
    } catch (e) {
      setError((e as Error)?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, refresh };
}