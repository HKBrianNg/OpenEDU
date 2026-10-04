// client/src/dashboard/AdminConsole/components/LogDetailModal.tsx

import { Modal, Descriptions, Tag } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import type { ApiLog } from '../types';
import JsonBlock from './JsonBlock';

interface Props {
  log: ApiLog | null;
  onClose: () => void;
}

export default function LogDetailModal({ log, onClose }: Props) {
  const { t } = useLocale();

  return (
    <Modal
      title={t('Dashboard.AdminConsole.logDetailTitle')}
      open={!!log}
      onCancel={onClose}
      footer={null}
      width={800}
      styles={{ body: { maxWidth: '100%', overflowX: 'hidden' } }}
    >
      {log && (
        <Descriptions column={1} bordered size="small" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <Descriptions.Item label={t('Dashboard.AdminConsole.logTime')}>
            {new Date(log.time).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label={t('Dashboard.AdminConsole.logMethod')}>
            {log.method}
          </Descriptions.Item>
          <Descriptions.Item label={t('Dashboard.AdminConsole.logUrl')}>
            {log.url}
          </Descriptions.Item>
          <Descriptions.Item label={t('Dashboard.AdminConsole.logStatus')}>
            <Tag color={log.status < 300 ? 'green' : log.status < 400 ? 'orange' : 'red'}>
              {log.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('Dashboard.AdminConsole.logDuration')}>
            {log.durationMs} ms
          </Descriptions.Item>
          <Descriptions.Item label={t('Dashboard.AdminConsole.logIp')}>
            <div style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {log.ip}
            </div>
          </Descriptions.Item>
          <Descriptions.Item label={t('Dashboard.AdminConsole.logRequestHeaders')}>
            <JsonBlock data={log.requestHeaders} />
          </Descriptions.Item>
          <Descriptions.Item label={t('Dashboard.AdminConsole.logRequestBody')}>
            <JsonBlock data={log.requestBody} />
          </Descriptions.Item>
          <Descriptions.Item label={t('Dashboard.AdminConsole.logResponseBody')}>
            <JsonBlock data={log.responseBody} />
          </Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  );
}