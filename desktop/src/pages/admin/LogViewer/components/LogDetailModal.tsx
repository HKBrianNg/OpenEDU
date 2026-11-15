// desktop/src/pages/admin/LogViewer/components/LogDetailModal.tsx
import { Modal, Descriptions, Tag } from 'antd';
import JsonBlock from '../../JsonBlock';
import { useLocale } from '../../../../store/LocaleContext';
import type { ApiLog } from '../hooks/useApiLogs';

interface Props {
  log: ApiLog | null;
  onClose: () => void;
}

export default function LogDetailModal({ log, onClose }: Props) {
  const { t } = useLocale();

  return (
    <Modal
      title={t('admin.logViewer.detailTitle')}
      open={!!log}
      onCancel={onClose}
      footer={null}
      width={800}
      styles={{ body: { maxWidth: '100%', overflowX: 'hidden' } }}
    >
      {log && (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('admin.logViewer.colTime')}>
            {new Date(log.time).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.logViewer.colMethod')}>
            <Tag>{log.method}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.logViewer.colUrl')}>
            {log.url}
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.logViewer.colStatus')}>
            <Tag color={log.status < 300 ? 'green' : log.status < 400 ? 'orange' : 'red'}>
              {log.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.logViewer.colDuration')}>
            {log.durationMs} ms
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.logViewer.field.ip')}>
            {log.ip ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.logViewer.field.requestHeaders')}>
            <JsonBlock data={log.requestHeaders} />
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.logViewer.field.requestBody')}>
            <JsonBlock data={log.requestBody} />
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.logViewer.field.responseBody')}>
            <JsonBlock data={log.responseBody} />
          </Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  );
}