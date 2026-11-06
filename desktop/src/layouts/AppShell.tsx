import { useState, useEffect } from 'react';
import { Layout, Menu, Dropdown, Space } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LoginOutlined, SettingOutlined, GlobalOutlined, MoonOutlined } from '@ant-design/icons';
import { APP_CONFIG } from '../config/app';
import shellResource from '../locales/shell.json';
import { createTranslator, getCurrentLocale, setCurrentLocale } from '../utils/locale';
import type { RawMenuItem } from '../types/menu';
import type { MenuProps } from 'antd';
import menuRaw from '../config/menu.json';
import { isFeatureEnabled } from '../utils/featureRegistry';
import LoginModal from '../components/LoginModal';
import { useThemeMode } from '../hooks/useThemeMode';

const { Header, Content } = Layout;

function transformNav(
  rawList: RawMenuItem[],
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
      const labelText = t(item.label ?? item.key);
      const selected = item.key === selectedKey;

      const color = selected
        ? (isDark ? '#4096ff' : '#0066cc')
        : (isDark ? 'rgba(255, 255, 255, 0.78)' : '#374151');

      return {
        ...item,
        key: item.key,
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
  const t = createTranslator(shellResource);
  const [navItems, setNavItems] = useState<MenuProps['items']>([]);
  const [rawNav] = useState<RawMenuItem[]>(menuRaw as RawMenuItem[]);
  const [locale, setLocale] = useState<'zh-CN' | 'zh-TW' | 'en'>(getCurrentLocale());

  const { isDark, toggleTheme } = useThemeMode();
  const [loginOpen, setLoginOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setNavItems(transformNav(rawNav, t, isDark, location.pathname));
  }, [rawNav, locale, isDark, location.pathname]);

  const changeLang = (lng: 'zh-CN' | 'zh-TW' | 'en') => {
    setCurrentLocale(lng);
    setLocale(lng);
  };

  const settingMenuItems: MenuProps['items'] = [
    {
      key: 'lang',
      icon: <GlobalOutlined />,
      label: t('setting.language'),
      children: [
        { key: 'zh-CN', label: '简体中文', onClick: () => changeLang('zh-CN') },
        { key: 'zh-TW', label: '繁體中文', onClick: () => changeLang('zh-TW') },
        { key: 'en', label: 'English', onClick: () => changeLang('en') },
      ]
    },
    {
      key: 'dark',
      icon: <MoonOutlined />,
      label: isDark ? t('setting.light') : t('setting.dark'),
      onClick: toggleTheme
    }
  ];

  const pageTextColor = isDark ? '#e5e7eb' : '#1f2937';

  return (
    <Layout
      style={{
        minHeight: '100vh',
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
          theme="light"
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
            <LoginOutlined /> {t('login')}
          </span>
          <Dropdown menu={{ items: settingMenuItems }} trigger={['click']}>
            <SettingOutlined
              style={{
                fontSize: 18,
                cursor: 'pointer',
                color: isDark ? 'rgba(255,255,255,0.78)' : '#374151'
              }}
            />
          </Dropdown>
        </Space>
      </Header>

      <Content
        style={{
          padding: 24,
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
