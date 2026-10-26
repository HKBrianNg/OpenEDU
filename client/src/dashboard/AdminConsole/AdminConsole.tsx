// client/src/dashboard/AdminConsole/AdminConsole.tsx
import { Button } from 'antd';
import { useLocale } from '../../store/LocaleContext';
import HealthCheck from './components/HealthCheck';
import DBTest from './components/DBTest';
import LogsPanel from './components/LogsPanel';

interface AdminConsoleProps {
  onExit?: () => void;
}

export default function AdminConsole(_props: AdminConsoleProps) {
  const { t } = useLocale();

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>{t('Dashboard.AdminConsole.title')}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            onClick={() => window.open('https://supabase.com/', '_blank', 'noopener,noreferrer')}
            icon={<span>🔗</span>}
            style={{ borderRadius: 99 }}
          >
            {t('Dashboard.AdminConsole.openSupabase')}
          </Button>
          <Button
            onClick={() => window.open('https://dash.cloudflare.com/', '_blank', 'noopener,noreferrer')}
            icon={<span>☁️</span>}
            style={{ borderRadius: 99 }}
          >
            {t('Dashboard.AdminConsole.openCloudflare')}
          </Button>
          {/* 返回仪表板统一放在头部最右（固定不随页面滚动），这里不再重复放一个 */}
        </div>
      </div>

      <HealthCheck />

      <DBTest />

      <LogsPanel />
    </div>
  );
}
