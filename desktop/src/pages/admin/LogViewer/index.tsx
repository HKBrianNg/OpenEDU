// desktop/src/pages/admin/LogViewer/index.tsx
import { useState } from 'react';
import { Card, Table, Tag, Button, Select, InputNumber, Alert, Space } from 'antd';
import { useApiLogs } from './hooks/useApiLogs';
import LogDetailModal from './components/LogDetailModal';
import { useLocale } from '../../../store/LocaleContext';
import type { ApiLog } from './hooks/useApiLogs';

export function LogViewer() {
  const { t } = useLocale();
  const {
    logs,
    loading,
    error,
    refresh,
    methodFilter,
    setMethodFilter,
    statusFilter,
    setStatusFilter,
    logLimit,
    setLogLimit,
  } = useApiLogs();

  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'blue';
      case 'POST': return 'green';
      case 'PUT': return 'orange';
      case 'DELETE': return 'red';
      case 'PATCH': return 'purple';
      default: return 'default';
    }
  };

  const getStatusColor = (status: number) => {
    if (status < 300) return 'green';
    if (status < 400) return 'orange';
    return 'red';
  };

  const columns = [
    {
      title: t('admin.logViewer.colTime'),
      dataIndex: 'time' as const,
      key: 'time',
      render: (time: string) => new Date(time).toLocaleString(),
      width: 180,
    },
    {
      title: t('admin.logViewer.colMethod'),
      dataIndex: 'method' as const,
      key: 'method',
      width: 80,
      render: (method: string) => (
        <Tag color={getMethodColor(method)}>{method}</Tag>
      ),
    },
    {
      title: t('admin.logViewer.colUrl'),
      dataIndex: 'url' as const,
      key: 'url',
      ellipsis: true,
    },
    {
      title: t('admin.logViewer.colStatus'),
      dataIndex: 'status' as const,
      key: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: t('admin.logViewer.colDuration'),
      dataIndex: 'durationMs' as const,
      key: 'durationMs',
      width: 100,
      render: (ms: number) => `${ms} ms`,
    },
    {
      title: t('admin.logViewer.colActions'),
      key: 'actions',
      width: 80,
      render: (_: unknown, record: ApiLog) => (
        <Button size="small" onClick={() => setSelectedLog(record)}>
          {t('admin.logViewer.view')}
        </Button>
      ),
    },
  ];

  const toolbar = (
    <Space wrap size={8}>
      <Select
        placeholder={t('admin.logViewer.filterMethod')}
        style={{ width: 120 }}
        allowClear
        value={methodFilter || undefined}
        onChange={(value) => setMethodFilter(value || '')}
        options={[
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' },
          { value: 'PATCH', label: 'PATCH' },
        ]}
      />
      <Select
        placeholder={t('admin.logViewer.filterStatus')}
        style={{ width: 120 }}
        allowClear
        value={statusFilter || undefined}
        onChange={(value) => setStatusFilter(value || '')}
        options={[
          { value: '2xx', label: '2xx' },
          { value: '3xx', label: '3xx' },
          { value: '4xx', label: '4xx' },
          { value: '5xx', label: '5xx' },
        ]}
      />
      <InputNumber
        min={10}
        max={1000}
        value={logLimit}
        onChange={(value) => setLogLimit(value || 200)}
        style={{ width: 100 }}
      />
      <Button type="primary" onClick={refresh} loading={loading}>
        {t('admin.logViewer.refresh')}
      </Button>
    </Space>
  );

  return (
    <>
      <Card title={t('admin.logViewer.title')} style={{ marginBottom: 24 }} extra={toolbar}>
        {error ? (
          <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
        ) : (
          <Table<ApiLog>
            dataSource={logs}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 20 }}
            loading={loading}
          />
        )}
      </Card>
      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}