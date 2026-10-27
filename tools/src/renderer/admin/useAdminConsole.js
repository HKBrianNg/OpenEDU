// tools/src/renderer/admin/useAdminConsole.js
// 从 client/src/dashboard/AdminConsole/hooks/useAdminConsole.ts 搬过来：
// 只去掉了类型标注，逻辑一行没动。

import { useCallback, useState } from 'react';
import { api } from './apiClient';
import { t } from '../i18n';

// 后台服务健康检查（on-demand，由按钮触发）
export function useHealthCheck() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/health');
      if (res.ok) {
        setData(res.data);
      } else {
        setError(res.data?.message || t('Dashboard.AdminConsole.healthFetchFailed'));
      }
    } catch (e) {
      setError(e?.message || t('Dashboard.AdminConsole.healthNetworkError'));
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, refresh };
}

// 数据库连通性测试（on-demand）
export function useDbTest() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/db-test');
      if (res.ok) {
        setData(res.data);
      } else {
        setError(res.data?.message || t('Dashboard.AdminConsole.dbTestFailed'));
      }
    } catch (e) {
      setError(e?.message || t('Dashboard.AdminConsole.dbTestNetworkError'));
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, refresh };
}

// API 请求日志（on-demand，过滤状态在 hook 内）
export function useApiLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

      const res = await api.get(`/api/admin/logs?${params}`);
      if (res.ok && res.data.logs) {
        setLogs(res.data.logs);
      } else {
        setError(res.data?.message || t('Dashboard.AdminConsole.logsFetchFailed'));
      }
    } catch (e) {
      setError(e?.message || t('Dashboard.AdminConsole.logsNetworkError'));
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
