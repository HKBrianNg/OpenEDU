import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Drawer } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BookOutlined, HomeOutlined, InfoCircleOutlined, ExperimentOutlined, SunOutlined, MoonOutlined, GlobalOutlined, MenuOutlined } from '@ant-design/icons';
import { useLocale } from '../store/LocaleContext';
import { useGameStatus } from '../store/GameStatusContext';

const { Header, Content } = Layout;

interface MainLayoutProps {
  children?: React.ReactNode;
  currentTheme: 'light' | 'dark';
  setCurrentTheme: (theme: 'light' | 'dark') => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ currentTheme, setCurrentTheme, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale, setLocale } = useLocale();
  const { activeGame, exitGame } = useGameStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: t('nav.home') },
    { key: '/books', icon: <BookOutlined />, label: t('nav.books') },
    { key: '/music', icon: <BookOutlined />, label: t('nav.music') },
    { key: '/games', icon: <InfoCircleOutlined />, label: t('nav.games') },
    { key: '/lab', icon: <ExperimentOutlined />, label: t('nav.lab') },
  ];

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

        <Space>
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
            onClick={() => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')}
          />

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