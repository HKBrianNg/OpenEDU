import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Drawer } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BookOutlined, HomeOutlined, InfoCircleOutlined, SunOutlined, MoonOutlined, GlobalOutlined, MenuOutlined } from '@ant-design/icons';
import { useLocale } from '../store/LocaleContext';
import { useGameStatus } from '../store/GameStatusContext';
import GlobalSearch from '../components/GlobalSearch';

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
    { key: '/courses', icon: <BookOutlined />, label: t('nav.courses') },
    { key: '/about', icon: <InfoCircleOutlined />, label: t('nav.about') },
  ];

  const handleMenuClick = (key: string) => {
    navigate(key);
    setMobileMenuOpen(false);
  };

  // ---- Logo 点击逻辑 ----
  const handleLogoClick = () => {
    if (activeGame) {
      // 正在跑游戏 → 退出 + 刷新
      exitGame();
      navigate(0);
    } else {
      // 没跑游戏 → 正常跳首页
      navigate('/');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        position: 'fixed', 
        top: 0, 
        width: '100%', 
        zIndex: 1000,
        display: 'flex', 
        alignItems: 'center',
        padding: '0 16px',
        background: currentTheme === 'dark' ? '#141414' : '#e6f7ff',
      }}>
        {/* Logo - 点击回主页 */}
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
        </Button>

        {/* PC端菜单 */}
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
            display: 'flex',
          }}
          className="desktop-menu"
        />

        {/* 右侧操作区 */}
        <Space>
          <div className="desktop-search">
            <GlobalSearch />
          </div>
          
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

      {/* 手机端抽屉菜单 */}
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
        <div style={{ padding: '12px 0' }}>
          <GlobalSearch />
        </div>
      </Drawer>

      <Content style={{ marginTop: 64, padding: '16px' }}>
        {children ? children : <Outlet />}
      </Content>

      <style>{`
        @media (max-width: 767px) {
          .desktop-menu {
            display: none !important;
          }
          .desktop-search {
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