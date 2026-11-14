// desktop/src/layouts/AppShell.tsx
import { useState, useEffect } from 'react';
import { Layout, Menu, Dropdown, Space, ConfigProvider, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LoginOutlined,
  SettingOutlined,
  GlobalOutlined,
  MoonOutlined,
  SunOutlined
} from '@ant-design/icons';
import { useLocale } from '../store/LocaleContext';
import { primaryMenu, type MenuItem } from './primaryMenu';
import type { MenuProps } from 'antd';
import { isFeatureEnabled } from './featureRegistry';
import LoginModal from '../pages/home/components/LoginModal';
import { useTheme } from '../store/ThemeContext';
import { APP_CONFIG } from './app';

const { Header, Content } = Layout;
const { darkAlgorithm, defaultAlgorithm } = theme;

function transformNav(
  rawList: MenuItem[],
  t: (key: string) => string,
  isDark: boolean,
  selectedKey: string
): MenuProps['items'] {
  return rawList
    .filter(item => {
      if (!item.featureId) return true;
      return isFeatureEnabled(item.featureId);
    })
    .map(item => {
      const labelText = t(item.i18nPrefix);
      const selected = item.route === selectedKey;

      const color = selected
        ? isDark ? '#4096ff' : '#0066cc'
        : isDark ? 'rgba(255, 255, 255, 0.78)' : '#374151';

      return {
        key: item.route,
        label: (
          <span
            style={{
              color,
              opacity: 1,
              filter: 'none',
              WebkitFilter: 'none',
            }}
          >
            {labelText}
          </span>
        ),
      };
    });
}

export default function AppShell() {
  const { locale, setLocale, t } = useLocale();
  const { isDark, theme: currentTheme, toggleTheme } = useTheme();
  const [navItems, setNavItems] = useState<MenuProps['items']>([]);
  const [loginOpen, setLoginOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

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
    }
  ];

  const pageTextColor = isDark ? '#e5e7eb' : '#1f2937';
  const menuTheme = currentTheme;

  return (
    <Layout
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
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
          <span
            style={{
              fontSize: 26,
              fontWeight: 'bold',
              color: isDark ? '#4096ff' : '#0066cc'
            }}
          >
            OpenEDU
          </span>
          <span
            style={{
              marginLeft: '6px',
              fontSize: '14px',
              color: isDark ? '#82a9d8' : '#5088c2',
              fontWeight: 'normal'
            }}
          >
            {APP_CONFIG.version}
          </span>
        </div>

        <Menu
          theme={menuTheme}
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={navItems}
          onClick={({ key }) => navigate(key)}
          style={{
            flex: 1,
            background: 'transparent',
            borderBottom: 'none',
            fontSize: 16
          }}
        />

        <Space size={16}>
          <span
            style={{
              cursor: 'pointer',
              fontSize: 16,
              color: isDark ? 'rgba(255,255,255,0.78)' : '#1f2937'
            }}
            onClick={() => setLoginOpen(true)}
          >
            <LoginOutlined /> {t('shell.login')}
          </span>
          <ConfigProvider
            theme={{
              algorithm: currentTheme === 'dark' ? [darkAlgorithm] : [defaultAlgorithm]
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
          minHeight: 0,
          overflow: 'hidden',
          padding: 12,
          background: 'transparent',
          color: pageTextColor
        }}
      >
        <Outlet />
      </Content>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => {}}
      />
    </Layout>
  );
}