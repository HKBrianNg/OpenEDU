// 从 client/src/dashboard/AdminConsole/components/LogsPanel.tsx 搬过来，逻辑未改。
// 窄屏那套判断保留了：桌面窗口拉窄时同样受用。

import { useState } from 'react';
import { Card, Table, Tag, Button, Select, InputNumber, Alert, Space } from 'antd';
import { useApiLogs } from '../useAdminConsole';
import LogDetailModal from './LogDetailModal';
import { t } from '../../i18n';

export default function LogsPanel() {
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
  const [selectedLog, setSelectedLog] = useState(null);

  const columns = [
    {
      title: t('Dashboard.AdminConsole.logTime'),
      dataIndex: 'time',
      key: 'time',
      render: (time) => new Date(time).toLocaleString(),
      width: 180,
    },
    {
      title: t('Dashboard.AdminConsole.logMethod'),
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method) => (
        <Tag
          color={
            method === 'GET' ? 'blue' : method === 'POST' ? 'green' : method === 'PUT' ? 'orange' : 'red'
          }
        >
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
      render: (status) => (
        <Tag color={status < 300 ? 'green' : status < 400 ? 'orange' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: t('Dashboard.AdminConsole.logDuration'),
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 100,
      render: (ms) => `${ms} ms`,
    },
    {
      title: t('Dashboard.AdminConsole.logActions'),
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button size="small" onClick={() => setSelectedLog(record)}>
          {t('Dashboard.AdminConsole.logView')}
        </Button>
      ),
    },
  ];

  const toolbar = (
    <Space wrap size={8}>
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
  );

  return (
    <>
      <Card title={t('Dashboard.AdminConsole.logsTitle')} style={{ marginBottom: 24 }} extra={toolbar}>
        {error ? (
          <Alert type="error" message={error} showIcon />
        ) : (
          <Table
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
