// 从 client/src/dashboard/AdminConsole/components/DBTest.tsx 搬过来，逻辑未改

import { Card, Descriptions, Tag, Spin, Alert, Button } from 'antd';
import { useDbTest } from '../useAdminConsole';
import { t } from '../../i18n';

export default function DbTest() {
  const { data: dbTest, loading, error, refresh } = useDbTest();

  return (
    <Card
      title={t('Dashboard.AdminConsole.dbTestTitle')}
      style={{ marginBottom: 24 }}
      extra={
        <Button onClick={refresh} loading={loading}>
          {t('Dashboard.AdminConsole.dbTest')}
        </Button>
      }
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      )}

      {error && !loading && <Alert type="error" message={error} showIcon />}

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
