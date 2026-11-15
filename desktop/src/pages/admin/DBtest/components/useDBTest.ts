// desktop/src/pages/admin/DBtest/components/useDBTest.ts
import { useCallback, useState } from 'react';
import { api } from '../../../../utils/request';
import { useLocale } from '../../../../store/LocaleContext';

export interface DbTestResult {
  status: string;
  message?: string;
  latency?: number;
  [key: string]: unknown;
}

export function useDbTest() {
  const { t } = useLocale();

  const [data, setData] = useState<DbTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DbTestResult>('/api/db-test');
      if (res.ok) {
        const resData = res.data as DbTestResult;

        // 拦截接口返回的简体 message，替换为当前语言翻译
        if (resData.message === '数据库连接成功') {
          resData.message = t('admin.dbTest.msgSuccess');
        }

        setData(resData);
      } else {
        const errMsg = (res.data as { message?: string })?.message
          || t('admin.dbTest.fetchFailed');
        setError(errMsg);
        setData(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.dbTest.networkError'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  return { data, loading, error, refresh };
}