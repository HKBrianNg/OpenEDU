// desktop/src/pages/admin/LogViewer/hooks/useApiLogs.ts
import { useCallback, useState } from 'react';
import { api } from '../../../../utils/request';
import { useLocale } from '../../../../store/LocaleContext';

export interface ApiLog {
  id: string;
  time: string;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  ip?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
}

export interface UseApiLogsReturn {
  logs: ApiLog[];
  loading: boolean;
  error: string | null;
  methodFilter: string;
  setMethodFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  logLimit: number;
  setLogLimit: (v: number) => void;
  refresh: () => Promise<void>;
}

export function useApiLogs(): UseApiLogsReturn {
  const { t } = useLocale();

  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [logLimit, setLogLimit] = useState(200);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('limit', String(logLimit));
      if (methodFilter) params.append('method', methodFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get<{ logs: ApiLog[] }>(`/api/admin/logs?${params}`);
      if (res.ok && res.data?.logs) {
        setLogs(res.data.logs);
      } else {
        const errMsg = (res.data as { message?: string })?.message
          || t('admin.logViewer.fetchFailed');
        setError(errMsg);
        setLogs([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.logViewer.networkError'));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [methodFilter, statusFilter, logLimit, t]);

  return {
    logs,
    loading,
    error,
    methodFilter,
    setMethodFilter,
    statusFilter,
    setStatusFilter,
    logLimit,
    setLogLimit,
    refresh,
  };
}