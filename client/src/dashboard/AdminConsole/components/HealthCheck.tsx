// client/src/dashboard/AdminConsole/components/HealthCheck.tsx
import { useState } from 'react';
import { Button, Card, Space, Tag } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import { api } from '../../../utils/request';
import type { HealthData, DbTestData } from '../types';

export default function HealthCheck() {
  const { t } = useLocale();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [db, setDb] = useState<DbTestData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingDb, setLoadingDb] = useState(false);

  // 后台服务健康检查
  const checkHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await api.get('/api/health');
      if (res.ok) {
        setHealth(res.data as HealthData);
      } else {
        setHealth({ status: 'error', version: res.data?.message || t('Dashboard.AdminConsole.healthFetchFailed') });
      }
    } catch (e: any) {
      setHealth({ status: 'error', version: t('Dashboard.AdminConsole.healthNetworkError') });
    } finally {
      setLoadingHealth(false);
    }
  };

  // 数据库连通性测试
  const checkDb = async () => {
    setLoadingDb(true);
    try {
      const res = await api.get('/api/db-test');
      if (res.ok) {
        setDb(res.data as DbTestData);
      } else {
        setDb({ status: 'error', message: res.data?.message || t('Dashboard.AdminConsole.dbTestFailed') });
      }
    } catch (e: any) {
      setDb({ status: 'error', message: t('Dashboard.AdminConsole.dbTestNetworkError') });
    } finally {
      setLoadingDb(false);
    }
  };

  return (
    <Card title={t('Dashboard.AdminConsole.serviceStatus')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* 左侧：后台服务状态 */}
        <Space size="large">
          <span>{t('Dashboard.AdminConsole.backendStatus')}</span>
          {health && <Tag color={health.status === 'ok' || health.status === 'healthy' ? 'green' : 'red'}>{health.status}</Tag>}
          <Button type="primary" loading={loadingHealth} onClick={checkHealth}>
            {t('Dashboard.AdminConsole.checkBackend')}
          </Button>
        </Space>

        {/* 右侧：数据库测试（紧挨着） */}
        <Space size="large" style={{ marginLeft: 24 }}>
          <span>{t('Dashboard.AdminConsole.dbTest')}</span>
          {db && <Tag color={db.status === 'ok' || db.status === 'healthy' ? 'blue' : 'red'}>{db.latency !== undefined ? `${db.latency} ms` : db.status}</Tag>}
          <Button loading={loadingDb} onClick={checkDb}>
            {t('Dashboard.AdminConsole.checkDb')}
          </Button>
        </Space>
      </div>
    </Card>
  );
}
