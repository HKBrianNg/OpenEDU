// tools/src/renderer/admin/AdminPanel.jsx
// 「后台管理」页：挂上从网页端搬过来的三块面板。
//
// 登录不在这里做 —— 整个工具统一在最外层登录（LoginPage + SessionContext），
// 这里默认已经是登录态，只管展示。

import { App as AntApp, Button, Space, Tabs } from 'antd';
import { CloudOutlined, LinkOutlined } from '@ant-design/icons';
import DBTest from './components/DBTest';
import LogsPanel from './components/LogsPanel';
import UserAdmin from './UserAdmin';
import { t } from '../i18n';

export default function AdminPanel() {
  const { message } = AntApp.useApp();

  // Electron 里 window.open 会被拦，外链交给主进程用系统浏览器开。
  // 同样要解 guard 的信封，否则失败了是静默的。
  const openExternal = async (url) => {
    const res = await window.api?.openExternal?.(url);
    if (res && res.ok === false) message.error(res.error || '打不开链接');
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<LinkOutlined />} onClick={() => openExternal('https://supabase.com/')}>
          {t('Dashboard.AdminConsole.openSupabase')}
        </Button>
        <Button icon={<CloudOutlined />} onClick={() => openExternal('https://dash.cloudflare.com/')}>
          {t('Dashboard.AdminConsole.openCloudflare')}
        </Button>
      </Space>

      <Tabs
        items={[
          { key: 'db', label: t('Dashboard.AdminConsole.dbTestTitle'), children: <DBTest /> },
          { key: 'logs', label: t('Dashboard.AdminConsole.logsTitle'), children: <LogsPanel /> },
          { key: 'users', label: t('Dashboard.UserAdmin.title'), children: <UserAdmin /> },
        ]}
      />
    </div>
  );
}
