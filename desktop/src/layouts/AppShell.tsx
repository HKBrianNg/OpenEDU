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

const { Header, Content } = Layout;

function transformNav(rawList: RawMenuItem[], t: (key: string) => string): MenuProps['items'] {
  return rawList
    .filter(item => {
      if (!item.featureId) return true;
      return isFeatureEnabled(item.featureId);
    })
    .map(item => {
      const labelText = t(item.label ?? item.key);
      return {
        ...item,
        key: item.key,
        label: labelText,
      };
    });
}

export default function AppShell() {
  const t = createTranslator(shellResource);
  const [navItems, setNavItems] = useState<MenuProps['items']>([]);
  const [rawNav] = useState<RawMenuItem[]>(menuRaw as RawMenuItem[]);
  const [locale, setLocale] = useState<'zh-CN' | 'zh-TW' | 'en'>(getCurrentLocale());
  const [darkMode, setDarkMode] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setNavItems(transformNav(rawNav, t));
  }, [rawNav, locale]);

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
      label: darkMode ? t('setting.light') : t('setting.dark'),
      onClick: () => {
        setDarkMode(!darkMode);
      }
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header
        style={{
          background: '#e6f7ff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          height: 64
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: 26, fontWeight: 'bold', color: '#0066cc' }}>
            OpenEDU
          </span>
          <span
            style={{
              marginLeft: '6px',
              fontSize: '14px',
              color: '#6699cc',
              fontWeight: 'normal'
            }}
          >
            {APP_CONFIG.version}
          </span>
        </div>

        <Menu
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
            style={{ cursor: 'pointer', fontSize: 16 }}
            onClick={() => navigate('/login')}
          >
            <LoginOutlined /> {t('login')}
          </span>
          <Dropdown menu={{ items: settingMenuItems }} trigger={['click']}>
            <SettingOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
          </Dropdown>
        </Space>
      </Header>

      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
