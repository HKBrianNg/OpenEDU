// client/src/layouts/index.tsx

import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Drawer, Avatar, Dropdown, App } from 'antd';
import { 
  BookOutlined, HomeOutlined, ExperimentOutlined, 
  SunOutlined, MoonOutlined, GlobalOutlined, MenuOutlined, 
  UserOutlined, SettingOutlined, LogoutOutlined, 
  AudioOutlined, ControlOutlined, DashboardOutlined 
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLocale } from '../store/LocaleContext';
import { useGameStatus } from '../store/GameStatusContext';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';

const { Header, Content } = Layout;

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { message } = App.useApp();
  const { theme: currentTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale, setLocale } = useLocale();
  const { activeGame, exitGame } = useGameStatus();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 基础菜单（所有用户可见）
  const baseMenuItems = [
    { key: '/', icon: <HomeOutlined />, label: t('nav.home') },
    { key: '/books', icon: <BookOutlined />, label: t('nav.books') },
    { key: '/music', icon: <AudioOutlined />, label: t('nav.music') },
    { key: '/games', icon: <ControlOutlined />, label: t('nav.games') },
  ];

  // admin 专属菜单
  const adminMenuItems = user?.role === 'admin' ? [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t('nav.dashboard') },
    { key: '/lab', icon: <ExperimentOutlined />, label: t('nav.lab') },
  ] : [];

  // 合并菜单
  const menuItems = [...baseMenuItems, ...adminMenuItems];

  const handleMenuClick = (key: string) => {
    navigate(key);
    setMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    if (activeGame) {
      exitGame();
      navigate(0);
    } else {
      navigate('/');
    }
  };

  const handleLogout = () => {
    logout();
    message.success(t('auth.logoutSuccess'));
    navigate('/');
  };

  // 用户下拉菜单（已登录时）
  const userMenuItems = [
    {
      key: 'preferences',
      icon: <SettingOutlined />,
      label: t('nav.preferences'),
      onClick: () => navigate('/preferences'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('nav.logout'),
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'fixed',
          top: 0,
          width: '100%',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          background: currentTheme === 'dark' ? '#141414' : '#e6f7ff',
        }}
      >
        <Button
          type="link"
          onClick={handleLogoClick}
          style={{
            color: currentTheme === 'dark' ? '#fff' : '#0050b3',
            fontSize: 20,
            fontWeight: 'bold',
            marginRight: 24,
            padding: 0,
            height: 'auto',
            lineHeight: 1.2,
          }}
        >
          {t('app.name')}
          <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 6, fontWeight: 'normal' }}>
            v{import.meta.env.VITE_DATA_VERSION}
          </span>
        </Button>

        <Menu
          theme={currentTheme === 'dark' ? 'dark' : 'light'}
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            borderBottom: 'none',
          }}
          className="desktop-menu"
        />

        <Space size={4}>
          <Button
            type="text"
            icon={<GlobalOutlined />}
            style={{ color: currentTheme === 'dark' ? '#fff' : '#0050b3' }}
            onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
          >
            {t('lang.switch')}
          </Button>
          <Button
            type="text"
            style={{ color: currentTheme === 'dark' ? '#fff' : '#0050b3' }}
            icon={currentTheme === 'light' ? <MoonOutlined /> : <SunOutlined />}
            onClick={() => setTheme(currentTheme === 'light' ? 'dark' : 'light')}
          />

          {/* 登录 / 用户头像 */}
          {user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer', marginLeft: 8 }}>
                <Avatar
                  style={{ backgroundColor: '#ff4d4f' }}
                  icon={<UserOutlined />}
                />
                <span style={{ color: currentTheme === 'dark' ? '#fff' : '#0050b3' }}>
                  {user.nickname || user.email}
                </span>
              </Space>
            </Dropdown>
          ) : (
            <Button
              type="text"
              icon={<UserOutlined />}
              style={{ color: currentTheme === 'dark' ? '#fff' : '#0050b3' }}
              onClick={() => navigate('/login')}
            >
              {t('nav.login')}
            </Button>
          )}

          <Button
            type="text"
            icon={<MenuOutlined />}
            style={{ color: currentTheme === 'dark' ? '#fff' : '#0050b3', display: 'none' }}
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
          />
        </Space>
      </Header>

      <Drawer
        title={t('app.name')}
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        size="small"
      >
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
          style={{ border: 'none' }}
        />
      </Drawer>

      <Content style={{ marginTop: 56, padding: '16px' }}>
        {children ? children : <Outlet />}
      </Content>

      <style>{`
        @media (max-width: 767px) {
          .desktop-menu {
            display: none !important;
          }
          .mobile-menu-btn {
            display: inline-flex !important;
          }
        }
      `}</style>
    </Layout>
  );
};

export default MainLayout;