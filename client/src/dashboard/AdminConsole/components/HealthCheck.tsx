// client/src/dashboard/AdminConsole/components/HealthCheck.tsx
import { useState } from 'react';
import { Button, Card, Space, Tag } from 'antd';
import { useLocale } from '../../../store/LocaleContext';

export default function HealthCheck() {
  const { t } = useLocale();
  const [health, setHealth] = useState<any>(null);
  const [db, setDb] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingDb, setLoadingDb] = useState(false);

  const checkHealth = async () => {
    setLoadingHealth(true);
    // 模拟/实际调用 /api/health
    setTimeout(() => {
      setHealth({ status: 'ok', time: new Date().toLocaleString() });
      setLoadingHealth(false);
    }, 500);
  };

  const checkDb = async () => {
    setLoadingDb(true);
    // 模拟/实际调用 /api/db-test
    setTimeout(() => {
      setDb({ status: 'connected', latency: '45ms' });
      setLoadingDb(false);
    }, 500);
  };

  return (
    <Card title={t('Dashboard.AdminConsole.serviceStatus')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* 左侧：后台服务状态 */}
        <Space size="large">
          <span>{t('Dashboard.AdminConsole.backendStatus')}</span>
          {health && <Tag color={health.status === 'ok' ? 'green' : 'red'}>{health.status}</Tag>}
          <Button type="primary" loading={loadingHealth} onClick={checkHealth}>
            {t('Dashboard.AdminConsole.checkBackend')}
          </Button>
        </Space>

        {/* 右侧：数据库测试（紧挨着） */}
        <Space size="large" style={{ marginLeft: 24 }}>
          <span>{t('Dashboard.AdminConsole.dbTest')}</span>
          {db && <Tag color="blue">{db.latency}</Tag>}
          <Button loading={loadingDb} onClick={checkDb}>
            {t('Dashboard.AdminConsole.checkDb')}
          </Button>
        </Space>
      </div>
    </Card>
  );
}