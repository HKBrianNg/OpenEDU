// client/src/dashboard/AdminConsole/components/DbTest.tsx

import { useState } from 'react';
import { Card, Descriptions, Tag, Spin, Alert, Button } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import { useAuth } from '../../../store/AuthContext';
import type { DbTestData } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function DbTest() {
  const { t } = useLocale();
  const { token } = useAuth();
  const [dbTest, setDbTest] = useState<DbTestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDbTest = async () => {
    setLoading(true);
    setError(null);
    setDbTest(null);
    try {
      const res = await fetch(`${API_BASE}/api/db-test`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (res.ok) {
        setDbTest(data);
      } else {
        setError(data.message || t('Dashboard.AdminConsole.dbTestFailed'));
      }
    } catch {
      setError(t('Dashboard.AdminConsole.dbTestNetworkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={t('Dashboard.AdminConsole.dbTestTitle')}
      style={{ marginBottom: 24 }}
      extra={
        <Button onClick={fetchDbTest} loading={loading}>
          {t('Dashboard.AdminConsole.dbTest')}
        </Button>
      }
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      )}

      {error && !loading && (
        <Alert type="error" message={error} showIcon />
      )}

      {dbTest && !loading && !error && (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('Dashboard.AdminConsole.dbTestStatus')}>
            <Tag color={dbTest.status === 'ok' || dbTest.status === 'healthy' ? 'green' : 'red'}>
              {dbTest.status}
            </Tag>
          </Descriptions.Item>
          {dbTest.message && (
            <Descriptions.Item label={t('Dashboard.AdminConsole.dbTestMessage')}>
              {dbTest.message}
            </Descriptions.Item>
          )}
          {dbTest.latency !== undefined && (
            <Descriptions.Item label={t('Dashboard.AdminConsole.dbTestLatency')}>
              {dbTest.latency} ms
            </Descriptions.Item>
          )}
          {Object.entries(dbTest)
            .filter(([key]) => !['status', 'message', 'latency'].includes(key))
            .map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </Descriptions.Item>
            ))}
        </Descriptions>
      )}
    </Card>
  );
}