// desktop/src/layouts/AppShell.tsx
import { useState, useEffect } from 'react';
import { Layout, Menu, Dropdown, Space, ConfigProvider, theme, Badge } from 'antd';
import { useLocation } from 'react-router-dom';
import {
  LoginOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useLocale } from '../store/LocaleContext';
import { useTabs } from '../store/TabContext';
import { TabProvider } from '../store/TabContext';
import { TabShell } from './TabShell';
import { primaryMenu, type MenuItem } from './primaryMenu';
import type { MenuProps } from 'antd';
import { LoginModal } from '../pages/home/components/LoginModal';
import { useTheme } from '../store/ThemeContext';
import { APP_CONFIG } from './app';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { BackendHealthModal } from '../pages/home/components/BackendHealthModal';
import { useAuth } from '../store/AuthContext';
import { PreferencesModal } from '../pages/home/components/PreferencesModal';

const { Header, Content } = Layout;
const { darkAlgorithm, defaultAlgorithm } = theme;

function transformNav(
  rawList: MenuItem[],
  t: (key: string) => string,
  isDark: boolean,
  selectedKey: string
): MenuProps['items'] {
  return rawList.map(item => {
    const labelText = t(item.i18nPrefix);
    const selected = item.route === selectedKey;

    const color = selected
      ? isDark ? '#4096ff' : '#0066cc'
      : isDark ? 'rgba(255, 255, 255, 0.78)' : '#374151';

    return {
      key: item.route,
      label: (
        <span style={{ color, opacity: 1, filter: 'none', WebkitFilter: 'none' }}>
          {labelText}
        </span>
      ),
    };
  });
}

export default function AppShell() {
  return (
    <TabProvider>
      <AppShellInner />
    </TabProvider>
  );
}

function AppShellInner() {
  const { locale, setLocale, t } = useLocale();
  const { openTab } = useTabs();
  const { isDark, theme: currentTheme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [navItems, setNavItems] = useState<MenuProps['items']>([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [prefOpen, setPrefOpen] = useState(false);

  const location = useLocation();

  const { data: healthData, loading: healthLoading, error: healthError } = useHealthCheck();

  useEffect(() => {
    setNavItems(transformNav(primaryMenu, t, isDark, location.pathname));
  }, [primaryMenu, locale, isDark, location.pathname]);

  const settingMenuItems: MenuProps['items'] = [
    {
      key: 'lang',
      icon: <GlobalOutlined />,
      label: t('shell.setting.language'),
      children: [
        { key: 'zh-CN', label: '简体中文', onClick: () => setLocale('zh-CN') },
        { key: 'zh-TW', label: '繁體中文', onClick: () => setLocale('zh-TW') },
        { key: 'en', label: 'English', onClick: () => setLocale('en') },
      ]
    },
    {
      key: 'theme',
      icon: isDark ? <SunOutlined /> : <MoonOutlined />,
      label: isDark ? t('shell.setting.light') : t('shell.setting.dark'),
      onClick: toggleTheme
    },
    { type: 'divider' },
    {
      key: 'health',
      icon: healthError
        ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
        : healthData
          ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
          : <CheckCircleOutlined />,
      label: healthError
        ? t('shell.health.error') || '后台异常'
        : healthData
          ? `${t('shell.health.ok') || '后台正常'} v${healthData.version}`
          : t('shell.health.checking') || '检查后台服务',
      onClick: () => setHealthOpen(true),
    },
  ];

  const pageTextColor = isDark ? '#e5e7eb' : '#1f2937';
  const menuTheme = currentTheme;

  const badgeStatus = healthLoading
    ? 'processing'
    : healthError
      ? 'error'
      : healthData
        ? 'success'
        : 'default';

  return (
    <Layout
      style={{
        height: '100dvh',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: isDark ? '#121417' : '#f7f8fa'
      }}
    >
      <Header
        style={{
          background: isDark ? '#1c2026' : '#e6f7ff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          height: 64,
          flexShrink: 0,
          boxShadow: isDark
            ? '0 1px 4px rgba(0,0,0,0.35)'
            : '0 1px 4px rgba(0, 102, 204, 0.12)'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: 26, fontWeight: 'bold', color: isDark ? '#4096ff' : '#0066cc' }}>
            OpenEDU
          </span>
          <span style={{ marginLeft: '6px', fontSize: '14px', color: isDark ? '#82a9d8' : '#5088c2', fontWeight: 'normal' }}>
            {APP_CONFIG.version}
          </span>
        </div>

        <Menu
          theme={menuTheme}
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={navItems}
          onClick={({ key }) => openTab(key)}
          style={{ flex: 1, background: 'transparent', borderBottom: 'none', fontSize: 16 }}
        />

        <Space size={16}>
          {isAuthenticated && user ? (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'userinfo',
                    icon: <UserOutlined />,
                    label: (
                      <div style={{ padding: '2px 0', minWidth: 160 }}>
                        <div style={{ fontWeight: 500 }}>{user.nickname || user.email}</div>
                        {user.nickname && (
                          <div style={{ fontSize: 12, opacity: 0.6 }}>{user.email}</div>
                        )}
                        <div style={{ fontSize: 12, opacity: 0.5 }}>{user.role}</div>
                      </div>
                    ),
                    disabled: true,
                  },
                  { type: 'divider' },
                  {
                    key: 'preferences',
                    icon: <SettingOutlined />,
                    label: t('shell.preferences.title') || '偏好设置',
                    onClick: () => setPrefOpen(true),
                  },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: t('shell.logout') || '退出登录',
                    onClick: () => {
                      logout();
                      openTab('/');
                    },
                  },
                ],
              }}
              trigger={['click']}
            >
              <Space size={6} style={{ cursor: 'pointer' }}>
                <Badge status={badgeStatus} size="small" />
                <span style={{ fontSize: 16, color: isDark ? 'rgba(255,255,255,0.78)' : '#1f2937' }}>
                  {user.nickname || user.email}
                </span>
              </Space>
            </Dropdown>
          ) : (
            <Space size={6}>
              <Badge status={badgeStatus} size="small" />
              <span
                style={{ cursor: 'pointer', fontSize: 16, color: isDark ? 'rgba(255,255,255,0.78)' : '#1f2937' }}
                onClick={() => setLoginOpen(true)}
              >
                <LoginOutlined /> {t('shell.login')}
              </span>
            </Space>
          )}

          <ConfigProvider
            theme={{
              algorithm: currentTheme === 'dark' ? darkAlgorithm : defaultAlgorithm
            }}
          >
            <Dropdown
              menu={{ items: settingMenuItems, theme: menuTheme }}
              trigger={['click']}
            >
              <SettingOutlined
                style={{
                  fontSize: 18,
                  cursor: 'pointer',
                  color: isDark ? 'rgba(255,255,255,0.78)' : '#374151'
                }}
              />
            </Dropdown>
          </ConfigProvider>
        </Space>
      </Header>

      <Content
        style={{
          flex: 1,
          height: 0,
          minHeight: 0,
          overflow: 'hidden',
          padding: 12,
          paddingBottom: 0,
          background: 'transparent',
          color: pageTextColor
        }}
      >
        <TabShell />
      </Content>

      <LoginModal
        open={loginOpen}
        onClose={()=> setLoginOpen(false)} 
        onSuccess={() => {}}
      />

      <BackendHealthModal
        open={healthOpen}
        onClose={() => setHealthOpen(false)}
      />

      <PreferencesModal
        open={prefOpen}
        onClose={() => setPrefOpen(false)}
      />
    </Layout>
  );
}