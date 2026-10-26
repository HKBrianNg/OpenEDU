// client/src/layouts/index.tsx

import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Drawer, Avatar, Dropdown, App } from 'antd';
import {
  BookOutlined, HomeOutlined,
  SunOutlined, MoonOutlined, GlobalOutlined, MenuOutlined,
  UserOutlined, SettingOutlined, LogoutOutlined,
  AudioOutlined, ControlOutlined, DashboardOutlined,
  CalendarOutlined, TrophyOutlined, LeftOutlined, ApiOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLocale } from '../store/LocaleContext';
import { useAuth } from '../store/AuthContext';
import { useSectionBack } from '../store/SectionBackContext';
import { useTheme } from '../store/ThemeContext';
import BackendHealthModal from '../components/BackendHealthModal';

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
  // 后台健康检查弹窗：菜单里点「检查后台服务」时开
  const [healthOpen, setHealthOpen] = useState(false);

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
    // 名字放进菜单里：头部窄的时候「头像 + 名字」横向很占宽度，
    // 现在外面只留头像（hover 有提示），点开菜单第一项就是账号信息
    {
      key: 'who',
      icon: <UserOutlined />,
      label: (
        <div style={{ padding: '2px 0', cursor: 'default' }}>
          <div style={{ fontWeight: 500 }}>{user?.nickname || user?.email}</div>
          {user?.nickname && user?.email && (
            <div style={{ fontSize: 12, opacity: 0.65 }}>{user.email}</div>
          )}
        </div>
      ),
    },
    { type: 'divider' as const },
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
    {
      key: 'health',
      icon: <ApiOutlined />,
      label: t('Dashboard.AdminConsole.checkBackend'),
      onClick: () => setHealthOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('nav.logout'),
      onClick: handleLogout,
    },
  ];

  // 未登录时的右上角菜单。原来这里是「点了直接跳登录」，
  // 现在同一个图标变成下拉：后台健康检查是公开接口（/api/health 不要 token），
  // 所以没登录也照样能查 —— 后台挂了的时候，连登都登不上，正是最需要看它的时候。
  const guestMenuItems = [
    {
      key: 'health',
      icon: <ApiOutlined />,
      label: t('Dashboard.AdminConsole.checkBackend'),
      onClick: () => setHealthOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'login',
      icon: <UserOutlined />,
      label: t('nav.login'),
      onClick: () => navigate('/login'),
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
          {/* 版本号挂在 logo 的右下角（角标式）。用绝对定位而不是跟在文字后面：
              既紧贴最后一个字不留空隙，又不占宽度 —— 窄屏时不会把 header 挤换行 */}
          <span style={{ position: 'relative', display: 'inline-block' }}>
            {t('app.name')}
            <span
              style={{
                position: 'absolute',
                left: '100%',
                bottom: 0,
                fontSize: 11,
                lineHeight: 1,
                opacity: 0.6,
                fontWeight: 'normal',
              }}
            >
              v{import.meta.env.VITE_DATA_VERSION}
            </span>
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
              {/* 登录后就一个头像，名字在菜单里；hover / 无障碍读屏靠 title */}
              <span
                style={{ cursor: 'pointer', marginLeft: 8, display: 'inline-flex' }}
                title={user.nickname || user.email}
                aria-label={user.nickname || user.email}
              >
                <Avatar style={{ backgroundColor: '#ff4d4f' }} icon={<UserOutlined />} />
              </span>
            </Dropdown>
          ) : (
            <Dropdown menu={{ items: guestMenuItems }} placement="bottomRight">
              <Button
                type="text"
                icon={<UserOutlined />}
                title={t('nav.login')}
                aria-label={t('nav.login')}
                style={{ color: currentTheme === 'dark' ? '#fff' : '#0050b3' }}
              >
                {/* 窄屏下这个类会被隐藏，只留图标 */}
                <span className="header-btn-text">{t('nav.login')}</span>
              </Button>
            </Dropdown>
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

      {/* 后台健康检查：登录前后都能从这里打开 */}
      <BackendHealthModal open={healthOpen} onClose={() => setHealthOpen(false)} />

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