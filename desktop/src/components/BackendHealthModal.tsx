import { useEffect } from 'react';
import { Modal, Descriptions, Tag, Spin, Alert, Button } from 'antd';
import { useLocale } from '../store/LocaleContext';
import { useHealthCheck } from '../hooks/useHealthCheck';
import type { HealthData } from '../hooks/useHealthCheck';

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

interface BackendHealthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BackendHealthModal({ open, onClose }: BackendHealthModalProps) {
  const { t } = useLocale();
  const { data: health, loading, error, refresh } = useHealthCheck();

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t('Dashboard.AdminConsole.healthTitle') || '后台服务状态'}
      width={480}
      footer={[
        <Button key="refresh" onClick={refresh} loading={loading}>
          {t('Dashboard.AdminConsole.checkService') || '检测'}
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          {t('Dashboard.AdminConsole.close') || '关闭'}
        </Button>,
      ]}
    >
      {loading && !health && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      )}

      {error && !loading && <Alert type="error" message={error} showIcon />}

      {health && !error && (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="状态">
            <Tag color={health.status === 'ok' || health.status === 'healthy' ? 'green' : 'red'}>
              {health.status}
            </Tag>
          </Descriptions.Item>
          {health.version && (
            <Descriptions.Item label="版本">
              <code style={{ fontSize: 14, fontWeight: 500 }}>{health.version}</code>
            </Descriptions.Item>
          )}
          {health.uptime !== undefined && (
            <Descriptions.Item label="运行时间">
              {formatUptime(health.uptime)}
            </Descriptions.Item>
          )}
          {health.timestamp && (
            <Descriptions.Item label="检测时间">
              {new Date(health.timestamp).toLocaleString()}
            </Descriptions.Item>
          )}
          {Object.entries(health as HealthData)
            .filter(([key]) => !['status', 'version', 'uptime', 'timestamp'].includes(key))
            .map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </Descriptions.Item>
            ))}
        </Descriptions>
      )}
    </Modal>
  );
}