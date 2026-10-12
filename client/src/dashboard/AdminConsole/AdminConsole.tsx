// client/src/dashboard/AdminConsole/AdminConsole.tsx
import { Button } from 'antd';
import { useLocale } from '../../store/LocaleContext';
import HealthCheck from './components/HealthCheck';
import DBTest from './components/DBTest';
import LogsPanel from './components/LogsPanel';

interface AdminConsoleProps {
  onExit?: () => void;
}

export default function AdminConsole({ onExit }: AdminConsoleProps) {
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
        </div>
      </div>

      <HealthCheck />

      <DBTest />

      <LogsPanel />
    </div>
  );
}
