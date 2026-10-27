// client/src/components/BackendHealthModal.tsx
//
// 后台服务健康检查。原先是管理控制台里的一张卡片，现在搬进头部的用户/登录菜单，
// 所以**没登录也能打开** —— 后台通不通是最该第一时间能确认的事，
// 却偏偏要先进管理后台才看得到，不合理。
// /api/health 本身不需要 token，所以这里不做任何登录态判断。

import { useEffect } from 'react';
import { Modal, Descriptions, Tag, Spin, Alert, Button } from 'antd';
import { useLocale } from '../store/LocaleContext';
import { useHealthCheck } from '../hooks/useHealthCheck';
import type { HealthData } from '../hooks/useHealthCheck';

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

interface BackendHealthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BackendHealthModal({ open, onClose }: BackendHealthModalProps) {
  const { t } = useLocale();
  const { data: health, loading, error, refresh } = useHealthCheck();

  // 每次打开都自动查一次：愿意点开这个框的人，就是想看「现在通不通」
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t('Dashboard.AdminConsole.healthTitle')}
      footer={[
        <Button key="refresh" onClick={refresh} loading={loading}>
          {t('Dashboard.AdminConsole.checkService')}
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          {t('Dashboard.AdminConsole.close')}
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
          {/* 后台以后加了新字段也照显示，不用改这里 */}
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
