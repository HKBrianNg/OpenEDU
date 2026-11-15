// desktop/src/pages/admin/DBtest/index.tsx
import { Card, Descriptions, Tag, Spin, Alert, Button } from 'antd';
import { useDbTest } from './components/useDBTest';
import JsonBlock from '../JsonBlock';
import { useLocale } from '../../../store/LocaleContext';

export function DBTest() {
  const { t } = useLocale();
  const { data: dbTest, loading, error, refresh } = useDbTest();

  // 动态字段名 → i18n 标签映射
  const getLabel = (key: string): string => {
    const labelMap: Record<string, string> = {
      data: t('admin.dbTest.field.data'),
      now: t('admin.dbTest.field.now'),
    };
    return labelMap[key] || key;
  };

  return (
    <Card
      title={t('admin.dbTest.title')}
      style={{ marginBottom: 24 }}
      extra={
        <Button type="primary" onClick={refresh} loading={loading}>
          {t('admin.dbTest.test')}
        </Button>
      }
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      )}

      {error && !loading && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {dbTest && !loading && !error && (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('admin.dbTest.status')}>
            <Tag color={dbTest.status !== 'error' ? 'green' : 'red'}>
              {dbTest.status}
            </Tag>
          </Descriptions.Item>

          {dbTest.message && (
            <Descriptions.Item label={t('admin.dbTest.message')}>
              {dbTest.message}
            </Descriptions.Item>
          )}

          {dbTest.latency !== undefined && (
            <Descriptions.Item label={t('admin.dbTest.latency')}>
              {dbTest.latency} ms
            </Descriptions.Item>
          )}

          {Object.entries(dbTest)
            .filter(
              ([key]) =>
                !['status', 'message', 'latency'].includes(key),
            )
            .map(([key, value]) => (
              <Descriptions.Item key={key} label={getLabel(key)}>
                {typeof value === 'object' && value !== null ? (
                  <JsonBlock data={value} />
                ) : (
                  String(value)
                )}
              </Descriptions.Item>
            ))}
        </Descriptions>
      )}
    </Card>
  );
}