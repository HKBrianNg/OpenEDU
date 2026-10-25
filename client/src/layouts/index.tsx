// client/src/layouts/index.tsx

import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Drawer, Avatar, Dropdown, App } from 'antd';
import {
  BookOutlined, HomeOutlined,
  SunOutlined, MoonOutlined, GlobalOutlined, MenuOutlined,
  UserOutlined, SettingOutlined, LogoutOutlined,
  AudioOutlined, ControlOutlined, DashboardOutlined,
  CalendarOutlined, TrophyOutlined, LeftOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLocale } from '../store/LocaleContext';
import { useAuth } from '../store/AuthContext';
import { useSectionBack } from '../store/SectionBackContext';
import { useTheme } from '../store/ThemeContext';

const { Header, Content } = Layout;

const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { message } = App.useApp();
  const { theme: currentTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale, setLocale } = useLocale();
  const { user, logout } = useAuth();
  // 展开书本/音乐/游戏里的模块时，ModuleFrame 会在这里登记一个「返回上一层」
  const { back: sectionBack } = useSectionBack();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const baseMenuItems = [
    { key: '/', icon: <HomeOutlined />, label: t('nav.home') },
    { key: '/books', icon: <BookOutlined />, label: t('nav.books') },
    { key: '/music', icon: <AudioOutlined />, label: t('nav.music') },
    { key: '/games', icon: <ControlOutlined />, label: t('nav.games') },
  ];

  const adminMenuItems = user?.role === 'admin' ? [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t('nav.dashboard') },
  ] : [];

  const menuItems = [...baseMenuItems, ...adminMenuItems];

  // 回大厅不用单独按钮了：左上角 OpenEDU logo 点了就是回首页，意思完全一样。
  // 只有「返回上一层」（书籍/音乐/游戏）还留着按钮，因为它回去的是卡片墙不是首页。

  const handleMenuClick = (key: string) => {
    navigate(key);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    message.success(t('auth.logoutSuccess'));
    navigate('/');
  };

  // 用户菜单：日程表和学习成果是个人数据，收进头像菜单而不是摆在首页
  const userMenuItems = [
    {
      key: 'calendar',
      icon: <CalendarOutlined />,
      label: t('nav.myCalendar'),
      onClick: () => navigate('/calendar'),
    },
    {
      key: 'learningResults',
      icon: <TrophyOutlined />,
      label: t('nav.learningResults'),
      onClick: () => navigate('/learning-results'),
    },
    { type: 'divider' as const },
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

  // 设置菜单（语言 / 主题）。原来挂在 logo 的下拉里，
  // logo 改成「点了回首页」后，搬到了右上角的设置图标
  const settingsMenuItems = [
    {
      key: 'language',
      icon: <GlobalOutlined />,
      label: t('lang.switch'),
      onClick: () => setLocale(locale === 'zh' ? 'en' : 'zh'),
    },
    {
      key: 'theme',
      icon: currentTheme === 'light' ? <MoonOutlined /> : <SunOutlined />,
      label: currentTheme === 'light' ? t('theme.dark') : t('theme.light'),
      onClick: () => setTheme(currentTheme === 'light' ? 'dark' : 'light'),
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
        {/* OpenEDU Logo - 点了回首页 */}
        <Button
          type="link"
          onClick={() => navigate('/')}
          title={t('nav.home')}
          style={{
            color: currentTheme === 'dark' ? '#fff' : '#0050b3',
            fontSize: 20,
            fontWeight: 'bold',
            marginRight: 24,
            padding: 0,
            height: 'auto',
            lineHeight: 1.2,
            // 头部窄的时候 logo 不能被压缩：压了「OpenEDU v1.2」会掉行、版本号看不见
            flexShrink: 0,
            whiteSpace: 'nowrap',
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
          {/* 用户头像/登录（语言切换已移除） */}
          {user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer', marginLeft: 8 }}>
                <Avatar style={{ backgroundColor: '#ff4d4f' }} icon={<UserOutlined />} />
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

          {/* 设置：语言 / 主题 */}
          <Dropdown menu={{ items: settingsMenuItems }} placement="bottomRight">
            <Button
              type="text"
              icon={<SettingOutlined />}
              title={t('nav.settings')}
              aria-label={t('nav.settings')}
              style={{ color: currentTheme === 'dark' ? '#fff' : '#0050b3' }}
            />
          </Dropdown>

          {/* 返回上一层（书籍/音乐/游戏）：只有展开了模块时才出现，
              由 ModuleFrame 通过 SectionBackContext 登记上来 */}
          {sectionBack && (
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={sectionBack.onBack}
              title={sectionBack.label}
              style={{ color: currentTheme === 'dark' ? '#fff' : '#0050b3' }}
            >
              <span className="header-btn-text">{sectionBack.label}</span>
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
          /* 窄屏头部挤，返回按钮只留箭头图标 */
          .header-btn-text {
            display: none;
          }
        }
      `}</style>
    </Layout>
  );
};

export default MainLayout;