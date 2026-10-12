// client/src/dashboard/AdminConsole/hooks/useAdminConsole.ts
import { useCallback, useState } from 'react';
import { api } from '../../../utils/request';
import type { HealthData, DbTestData, ApiLog } from '../types';

// 后台服务健康检查（on-demand，由按钮触发）
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
        setError((res.data as { message?: string })?.message || 'healthFetchFailed');
      }
    } catch (e) {
      setError((e as Error)?.message || 'healthNetworkError');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, refresh };
}

// 数据库连通性测试（on-demand）
export function useDbTest() {
  const [data, setData] = useState<DbTestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DbTestData>('/api/db-test');
      if (res.ok) {
        setData(res.data);
      } else {
        setError((res.data as { message?: string })?.message || 'dbTestFailed');
      }
    } catch (e) {
      setError((e as Error)?.message || 'dbTestNetworkError');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, refresh };
}

// API 请求日志（on-demand，过滤状态在 hook 内）
export function useApiLogs() {
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

      const res = await api.get<{ logs: ApiLog[]; message?: string }>(
        `/api/admin/logs?${params}`,
      );
      if (res.ok && res.data.logs) {
        setLogs(res.data.logs);
      } else {
        setError(res.data?.message || 'logsFetchFailed');
      }
    } catch (e) {
      setError((e as Error)?.message || 'logsNetworkError');
    } finally {
      setLoading(false);
    }
  }, [methodFilter, statusFilter, logLimit]);

  return {
    logs,
    loading,
    error,
    refresh,
    methodFilter,
    setMethodFilter,
    statusFilter,
    setStatusFilter,
    logLimit,
    setLogLimit,
  };
}
