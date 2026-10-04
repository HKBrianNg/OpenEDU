// client/src/dashboard/AdminConsole/AdminConsole.tsx

import { useState } from 'react';
import { Button, Card, Descriptions, Spin, Tag, Alert, Space } from 'antd';
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

interface AdminConsoleProps {
  onExit?: () => void;
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
            type="primary"
            onClick={fetchHealth}
            loading={healthLoading}
          >
            {t('Dashboard.AdminConsole.checkService')}
          </Button>
          <Button
            onClick={fetchDbTest}
            loading={dbTestLoading}
          >
            {t('Dashboard.AdminConsole.dbTest')}
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
    </div>
  );
}