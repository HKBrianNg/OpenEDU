// client/src/dashboard/AdminConsole/AdminConsole.tsx

import { useState } from 'react';
import { Button, Card, Descriptions, Spin, Tag, Alert, Space, Table, Modal, Select, InputNumber } from 'antd';
import { useLocale } from '../../store/LocaleContext';
import { useAuth } from '../../store/AuthContext';

// 从环境变量读取后台地址
const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface HealthData {
  status: string;
  version: string;
  uptime?: number;
  timestamp?: string;
  [key: string]: unknown;
}

interface DbTestData {
  status: string;
  message?: string;
  latency?: number;
  [key: string]: unknown;
}

interface ApiLog {
  id: string;
  time: string;
  method: string;
  url: string;
  requestHeaders: Record<string, unknown>;
  requestBody: unknown;
  status: number;
  responseBody: unknown;
  durationMs: number;
  ip: string;
}

interface AdminConsoleProps {
  onExit?: () => void;
}

// 统一日志详情 JSON 展示组件（控制宽度与换行）
function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre style={{ 
      fontSize: 12, 
      background: '#f5f5f5', 
      padding: 8, 
      borderRadius: 4, 
      maxHeight: 200, 
      overflow: 'auto',
      maxWidth: '100%',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      margin: 0,
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function AdminConsole({ onExit }: AdminConsoleProps) {
  const { t } = useLocale();
  const { token } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [dbTest, setDbTest] = useState<DbTestData | null>(null);
  const [dbTestLoading, setDbTestLoading] = useState(false);
  const [dbTestError, setDbTestError] = useState<string | null>(null);

  // API Logs 状态
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [logLimit, setLogLimit] = useState(200);

  // 获取健康检查数据（用户点击 Check Service 时触发）
  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    setHealth(null);
    try {
      const res = await fetch(`${API_BASE}/api/health`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (res.ok) {
        setHealth(data);
      } else {
        setHealthError(data.message || t('Dashboard.AdminConsole.healthFetchFailed'));
      }
    } catch (e) {
      setHealthError(t('Dashboard.AdminConsole.healthNetworkError'));
    } finally {
      setHealthLoading(false);
    }
  };

  // 数据库测试（用户点击 DB Test 时触发）
  const fetchDbTest = async () => {
    setDbTestLoading(true);
    setDbTestError(null);
    setDbTest(null);
    try {
      const res = await fetch(`${API_BASE}/api/db-test`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (res.ok) {
        setDbTest(data);
      } else {
        setDbTestError(data.message || t('Dashboard.AdminConsole.dbTestFailed'));
      }
    } catch (e) {
      setDbTestError(t('Dashboard.AdminConsole.dbTestNetworkError'));
    } finally {
      setDbTestLoading(false);
    }
  };

  // 获取 API 日志
  const fetchLogs = async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const params = new URLSearchParams();
      params.append('limit', String(logLimit));
      if (methodFilter) params.append('method', methodFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`${API_BASE}/api/admin/logs?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (res.ok) {
        setLogs(data.logs);
      } else {
        setLogsError(data.message || t('Dashboard.AdminConsole.logsFetchFailed'));
      }
    } catch (e) {
      setLogsError(t('Dashboard.AdminConsole.logsNetworkError'));
    } finally {
      setLogsLoading(false);
    }
  };

  // 格式化 uptime（秒 -> 可读格式）
  const formatUptime = (seconds: number): string => {
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
  };

  // 日志表格列
  const logColumns = [
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
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>{t('Dashboard.AdminConsole.title')}</h1>
        <Space>
          {onExit && (
            <Button
              onClick={onExit}
              style={{
                borderRadius: 99,
                border: '1px solid #d0d0d0',
                background: '#fff',
                color: '#333',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ← {t('Dashboard.AdminConsole.backToDashboard')}
            </Button>
          )}
          <Button
            onClick={fetchHealth}
            loading={healthLoading}
            style={{ borderRadius: 99 }}
          >
            {t('Dashboard.AdminConsole.checkService')}
          </Button>
          <Button
            onClick={fetchDbTest}
            loading={dbTestLoading}
            style={{ borderRadius: 99 }}
          >
            {t('Dashboard.AdminConsole.dbTest')}
          </Button>
          <Button
            onClick={fetchLogs}
            loading={logsLoading}
            style={{ borderRadius: 99 }}
          >
            {t('Dashboard.AdminConsole.viewLogs')}
          </Button>
          {/* 打开 Supabase 官网 */}
          <Button
            onClick={() => window.open('https://supabase.com/', '_blank', 'noopener,noreferrer')}
            icon={<span>🔗</span>}
            style={{ borderRadius: 99 }}
          >
            {t('Dashboard.AdminConsole.openSupabase')}
          </Button>
          {/* 打开 Cloudflare 官网 */}
          <Button
            onClick={() => window.open('https://dash.cloudflare.com/', '_blank', 'noopener,noreferrer')}
            icon={<span>☁️</span>}
            style={{ borderRadius: 99 }}
          >
            {t('Dashboard.AdminConsole.openCloudflare')}
          </Button>
        </Space>
      </div>

      {/* 健康检查结果 */}
      {healthLoading && (
        <Card style={{ maxWidth: 600, marginBottom: 24 }}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        </Card>
      )}

      {healthError && !healthLoading && (
        <Card style={{ maxWidth: 600, marginBottom: 24 }}>
          <Alert type="error" message={healthError} showIcon />
        </Card>
      )}

      {health && !healthLoading && !healthError && (
        <Card
          title={t('Dashboard.AdminConsole.healthTitle')}
          style={{ maxWidth: 600, marginBottom: 24 }}
        >
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t('Dashboard.AdminConsole.healthStatus')}>
              <Tag color={health.status === 'ok' || health.status === 'healthy' ? 'green' : 'red'}>
                {health.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('Dashboard.AdminConsole.healthVersion')}>
              <code style={{ fontSize: 14, fontWeight: 500 }}>{health.version}</code>
            </Descriptions.Item>
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
            {Object.entries(health)
              .filter(([key]) => !['status', 'version', 'uptime', 'timestamp'].includes(key))
              .map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Descriptions.Item>
              ))}
          </Descriptions>
        </Card>
      )}

      {/* 数据库测试结果 */}
      {dbTestLoading && (
        <Card style={{ maxWidth: 600, marginBottom: 24 }}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        </Card>
      )}

      {dbTestError && !dbTestLoading && (
        <Card style={{ maxWidth: 600, marginBottom: 24 }}>
          <Alert type="error" message={dbTestError} showIcon />
        </Card>
      )}

      {dbTest && !dbTestLoading && !dbTestError && (
        <Card
          title={t('Dashboard.AdminConsole.dbTestTitle')}
          style={{ maxWidth: 600, marginBottom: 24 }}
        >
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t('Dashboard.AdminConsole.dbTestStatus')}>
              <Tag color={dbTest.status === 'ok' || dbTest.status === 'healthy' ? 'green' : 'red'}>
                {dbTest.status}
              </Tag>
            </Descriptions.Item>
            {dbTest.message && (
              <Descriptions.Item label={t('Dashboard.AdminConsole.dbTestMessage')}>
                {dbTest.message}
              </Descriptions.Item>
            )}
            {dbTest.latency !== undefined && (
              <Descriptions.Item label={t('Dashboard.AdminConsole.dbTestLatency')}>
                {dbTest.latency} ms
              </Descriptions.Item>
            )}
            {/* 其他可能的字段 */}
            {Object.entries(dbTest)
              .filter(([key]) => !['status', 'message', 'latency'].includes(key))
              .map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Descriptions.Item>
              ))}
          </Descriptions>
        </Card>
      )}

      {/* API 日志面板 */}
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
            <Button onClick={fetchLogs} loading={logsLoading}>
              {t('Dashboard.AdminConsole.logRefresh')}
            </Button>
          </Space>
        }
      >
        {logsError ? (
          <Alert type="error" message={logsError} showIcon />
        ) : (
          <Table
            dataSource={logs}
            columns={logColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20 }}
            loading={logsLoading}
          />
        )}
      </Card>

      {/* 日志详情弹窗 */}
      <Modal
        title={t('Dashboard.AdminConsole.logDetailTitle')}
        open={!!selectedLog}
        onCancel={() => setSelectedLog(null)}
        footer={null}
        width={800}
        styles={{ body: { maxWidth: '100%', overflowX: 'hidden' } }}
      >
        {selectedLog && (
          <Descriptions column={1} bordered size="small" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            <Descriptions.Item label={t('Dashboard.AdminConsole.logTime')}>
              {new Date(selectedLog.time).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label={t('Dashboard.AdminConsole.logMethod')}>
              {selectedLog.method}
            </Descriptions.Item>
            <Descriptions.Item label={t('Dashboard.AdminConsole.logUrl')}>
              {selectedLog.url}
            </Descriptions.Item>
            <Descriptions.Item label={t('Dashboard.AdminConsole.logStatus')}>
              <Tag color={selectedLog.status < 300 ? 'green' : selectedLog.status < 400 ? 'orange' : 'red'}>
                {selectedLog.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('Dashboard.AdminConsole.logDuration')}>
              {selectedLog.durationMs} ms
            </Descriptions.Item>
            <Descriptions.Item label={t('Dashboard.AdminConsole.logIp')}>
              <div style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedLog.ip}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label={t('Dashboard.AdminConsole.logRequestHeaders')}>
              <JsonBlock data={selectedLog.requestHeaders} />
            </Descriptions.Item>
            <Descriptions.Item label={t('Dashboard.AdminConsole.logRequestBody')}>
              <JsonBlock data={selectedLog.requestBody} />
            </Descriptions.Item>
            <Descriptions.Item label={t('Dashboard.AdminConsole.logResponseBody')}>
              <JsonBlock data={selectedLog.responseBody} />
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}