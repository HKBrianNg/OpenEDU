// client/src/dashboard/AdminConsole/components/HealthCheck.tsx
import { Card, Descriptions, Tag, Spin, Alert, Button } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import { useHealthCheck } from '../hooks/useAdminConsole';
import type { HealthData } from '../types';

// 把秒数格式化为可读字符串（d/h/m/s）
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}

export default function HealthCheck() {
  const { t } = useLocale();
  const { data: health, loading, error, refresh } = useHealthCheck();

  return (
    <Card
      title={t('Dashboard.AdminConsole.healthTitle')}
      style={{ maxWidth: 600, marginBottom: 24 }}
      extra={
        <Button onClick={refresh} loading={loading}>
          {t('Dashboard.AdminConsole.checkService')}
        </Button>
      }
    >
      {loading && !health && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      )}

      {error && !loading && (
        <Alert type="error" message={error} showIcon />
      )}

      {health && !error && (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('Dashboard.AdminConsole.healthStatus')}>
            <Tag color={health.status === 'ok' || health.status === 'healthy' ? 'green' : 'red'}>
              {health.status}
            </Tag>
          </Descriptions.Item>
          {health.version && (
            <Descriptions.Item label={t('Dashboard.AdminConsole.healthVersion')}>
              <code style={{ fontSize: 14, fontWeight: 500 }}>{health.version}</code>
            </Descriptions.Item>
          )}
          {health.uptime !== undefined && (
            <Descriptions.Item label={t('Dashboard.AdminConsole.healthUptime')}>
              {formatUptime(health.uptime)}
            </Descriptions.Item>
          )}
          {health.timestamp && (
            <Descriptions.Item label={t('Dashboard.AdminConsole.healthTimestamp')}>
              {new Date(health.timestamp).toLocaleString()}
            </Descriptions.Item>
          )}
          {/* 其他可能的字段 */}
          {Object.entries(health as HealthData)
            .filter(([key]) => !['status', 'version', 'uptime', 'timestamp'].includes(key))
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
