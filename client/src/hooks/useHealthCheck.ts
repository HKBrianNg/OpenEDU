// client/src/hooks/useHealthCheck.ts
//
// 后台健康检查。原先住在 dashboard/AdminConsole/，那个目录整体迁到 tools 桌面端之后，
// 网页端只剩自己这一个使用者（头部的「检查后台服务」菜单项），所以在 hooks/ 单独立户。
// 逻辑一行没改。

import { useCallback, useState } from 'react';
import { api } from '../utils/request';
import { useLocale } from '../store/LocaleContext';

export interface HealthData {
  status: string;
  version: string;
  uptime?: number;
  timestamp?: string;
  [key: string]: unknown;
}

export function useHealthCheck() {
  const { t } = useLocale();
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
        setError(
          (res.data as { message?: string })?.message ||
            t('Dashboard.AdminConsole.healthFetchFailed'),
        );
      }
    } catch (e) {
      setError((e as Error)?.message || t('Dashboard.AdminConsole.healthNetworkError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  return { data, loading, error, refresh };
}
