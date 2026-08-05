import React from 'react';
import { Layout, Menu, Button, Space } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BookOutlined, HomeOutlined, InfoCircleOutlined, SunOutlined, MoonOutlined, GlobalOutlined } from '@ant-design/icons';
import { useLocale } from '../store/LocaleContext';
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

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: t('nav.home') },
    { key: '/courses', icon: <BookOutlined />, label: t('nav.courses') },
    { key: '/about', icon: <InfoCircleOutlined />, label: t('nav.about') },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        position: 'fixed', 
        top: 0, 
        width: '100%', 
        zIndex: 1000,
        display: 'flex', 
        alignItems: 'center',
        background: currentTheme === 'dark' ? '#141414' : '#e6f7ff',
      }}>
        <div style={{ 
          color: currentTheme === 'dark' ? '#fff' : '#0050b3', 
          fontSize: 20, 
          fontWeight: 'bold', 
          marginRight: 40 
        }}>
          {t('app.name')}
        </div>
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
        />
        
        <Space>
          <GlobalSearch />
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
        </Space>
      </Header>
      <Content style={{ marginTop: 64, padding: 0 }}>
        {children ? children : <Outlet />}
      </Content>
    </Layout>
  );
};

export default MainLayout;