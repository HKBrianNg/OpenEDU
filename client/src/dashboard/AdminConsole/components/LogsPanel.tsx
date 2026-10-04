// client/src/dashboard/AdminConsole/components/LogsPanel.tsx

import { useState } from 'react';
import { Card, Table, Tag, Button, Select, InputNumber, Alert, Space } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import { useAuth } from '../../../store/AuthContext';
import type { ApiLog } from '../types';
import LogDetailModal from './LogDetailModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function LogsPanel() {
  const { t } = useLocale();
  const { token } = useAuth();
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [logLimit, setLogLimit] = useState(200);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('limit', String(logLimit));
      if (methodFilter) params.append('method', methodFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`${API_BASE}/api/admin/logs?${params}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setLogs(data.logs);
      else setError(data.message || t('Dashboard.AdminConsole.logsFetchFailed'));
    } catch {
      setError(t('Dashboard.AdminConsole.logsNetworkError'));
    } finally {
      setLoading(false);
    }
  };

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
              defaultValue={200}
              value={logLimit}
              onChange={(value) => setLogLimit(value || 200)}
              style={{ width: 100 }}
            />
            <Button onClick={fetchLogs} loading={loading}>
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