// client/src/dashboard/AdminConsole/AdminConsole.tsx
import { Button } from 'antd';
import { useLocale } from '../../store/LocaleContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import DBTest from './components/DBTest';
import LogsPanel from './components/LogsPanel';

interface AdminConsoleProps {
  onExit?: () => void;
}

export default function AdminConsole(_props: AdminConsoleProps) {
  const { t } = useLocale();
  const isMobile = useIsMobile();

  return (
    <div>
      {/* 窄屏竖排：横排时「标题 + 两个带字按钮」会挤成两行甚至横向溢出，
          按钮改成整行宽更好按 */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24 }}>
          {t('Dashboard.AdminConsole.title')}
        </h1>
        <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
          <Button
            onClick={() => window.open('https://supabase.com/', '_blank', 'noopener,noreferrer')}
            icon={<span>🔗</span>}
            block={isMobile}
            style={{ borderRadius: 99 }}
          >
            {t('Dashboard.AdminConsole.openSupabase')}
          </Button>
          <Button
            onClick={() => window.open('https://dash.cloudflare.com/', '_blank', 'noopener,noreferrer')}
            icon={<span>☁️</span>}
            block={isMobile}
            style={{ borderRadius: 99 }}
          >
            {t('Dashboard.AdminConsole.openCloudflare')}
          </Button>
        </div>
        {/* 返回仪表板统一放在头部最右（固定不随页面滚动），这里不再重复放一个 */}
      </div>

      {/* 后台健康检查搬走了：现在在头部用户/登录菜单里（未登录也能用），
          这里不再重复一张卡片 */}

      <DBTest />

      <LogsPanel />
    </div>
  );
}
