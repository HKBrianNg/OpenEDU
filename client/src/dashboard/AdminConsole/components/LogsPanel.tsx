// client/src/dashboard/AdminConsole/components/LogsPanel.tsx
import { useState } from 'react';
import { Card, Table, Tag, Button, Select, InputNumber, Alert, Space } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import { useApiLogs } from '../hooks/useAdminConsole';
import type { ApiLog } from '../types';
import LogDetailModal from './LogDetailModal';

export default function LogsPanel() {
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

  const columns = [
    {
      title: t('Dashboard.AdminConsole.logTime'),
      dataIndex: 'time',
      key: 'time',
      render: (time: string) => new Date(time).toLocaleString(),
      width: 180,
    },
    {
      title: t('Dashboard.AdminConsole.logMethod'),
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method: string) => (
        <Tag color={method === 'GET' ? 'blue' : method === 'POST' ? 'green' : method === 'PUT' ? 'orange' : 'red'}>
          {method}
        </Tag>
      ),
    },
    {
      title: t('Dashboard.AdminConsole.logUrl'),
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
    },
    {
      title: t('Dashboard.AdminConsole.logStatus'),
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={status < 300 ? 'green' : status < 400 ? 'orange' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: t('Dashboard.AdminConsole.logDuration'),
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 100,
      render: (ms: number) => `${ms} ms`,
    },
    {
      title: t('Dashboard.AdminConsole.logActions'),
      key: 'actions',
      width: 80,
      render: (_: unknown, record: ApiLog) => (
        <Button size="small" onClick={() => setSelectedLog(record)}>
          {t('Dashboard.AdminConsole.logView')}
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card
        title={t('Dashboard.AdminConsole.logsTitle')}
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            <Select
              placeholder={t('Dashboard.AdminConsole.logMethodFilter')}
              style={{ width: 120 }}
              allowClear
              value={methodFilter || undefined}
              onChange={(value) => setMethodFilter(value || '')}
              options={[
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
                { value: 'PUT', label: 'PUT' },
                { value: 'DELETE', label: 'DELETE' },
              ]}
            />
            <Select
              placeholder={t('Dashboard.AdminConsole.logStatusFilter')}
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
            <Button onClick={refresh} loading={loading}>
              {t('Dashboard.AdminConsole.logRefresh')}
            </Button>
          </Space>
        }
      >
        {error ? (
          <Alert type="error" message={error} showIcon />
        ) : (
          <Table
            dataSource={logs}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20 }}
            loading={loading}
          />
        )}
      </Card>
      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}
