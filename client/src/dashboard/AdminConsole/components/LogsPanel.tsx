// client/src/dashboard/AdminConsole/components/LogsPanel.tsx
import { useState } from 'react';
import { Card, Table, Tag, Button, Select, InputNumber, Alert, Space } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useApiLogs } from '../hooks/useAdminConsole';
import type { ApiLog } from '../types';
import LogDetailModal from './LogDetailModal';

export default function LogsPanel() {
  const { t } = useLocale();
  const isMobile = useIsMobile();
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
      // 窄屏只要时分秒：完整日期在详情里有，这里省出来的宽度留给 URL
      render: (time: string) =>
        isMobile ? new Date(time).toLocaleTimeString() : new Date(time).toLocaleString(),
      width: isMobile ? 96 : 180,
    },
    {
      title: t('Dashboard.AdminConsole.logMethod'),
      dataIndex: 'method',
      key: 'method',
      width: isMobile ? 72 : 80,
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
      width: isMobile ? 72 : 80,
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
      width: isMobile ? 72 : 80,
      render: (_: unknown, record: ApiLog) => (
        <Button size="small" onClick={() => setSelectedLog(record)}>
          {t('Dashboard.AdminConsole.logView')}
        </Button>
      ),
    },
  ];

  // 筛选工具条。宽屏放卡片标题右侧（extra），窄屏搬进正文：
  // Card 的 head 是不折行的 flex，四个控件挤在标题旁边会在手机上溢出
  const toolbar = (
    <Space wrap size={8} style={{ width: isMobile ? '100%' : 'auto' }}>
      <Select
        placeholder={t('Dashboard.AdminConsole.logMethodFilter')}
        style={{ width: isMobile ? 'calc(50% - 4px)' : 120 }}
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
        style={{ width: isMobile ? 'calc(50% - 4px)' : 120 }}
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
        style={{ width: isMobile ? 'calc(50% - 4px)' : 100 }}
      />
      <Button onClick={refresh} loading={loading} block={isMobile}>
        {t('Dashboard.AdminConsole.logRefresh')}
      </Button>
    </Space>
  );

  // 窄屏少一列「耗时」：那列本来就是调试用，优先保证 URL 和时间可读
  const visibleColumns = isMobile ? columns.filter((c) => c.key !== 'durationMs') : columns;

  return (
    <>
      <Card
        title={t('Dashboard.AdminConsole.logsTitle')}
        style={{ marginBottom: 24 }}
        extra={isMobile ? null : toolbar}
      >
        {isMobile && <div style={{ marginBottom: 12 }}>{toolbar}</div>}

        {error ? (
          <Alert type="error" message={error} showIcon />
        ) : (
          <Table
            dataSource={logs}
            columns={visibleColumns}
            rowKey="id"
            size="small"
            // 列加起来的最小宽度超出屏宽时横向滚动，而不是把每列压成一团
            scroll={{ x: 'max-content' }}
            // SizeType 里不放 'default'（那是个默认值，不是合法枚举），用 undefined 兜
            pagination={{ pageSize: 20, size: isMobile ? 'small' : undefined, simple: isMobile }}
            loading={loading}
          />
        )}
      </Card>
      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}
