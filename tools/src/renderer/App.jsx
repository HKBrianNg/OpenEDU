// OpenEDU Tools 主界面
//
// 管的是「本地仓库里的内容」：单词配图、视频字幕、歌曲，外加后台管理。
// 提交推送不在这里做 —— 用 VS Code 的 git 更顺手，也更可控。
//
// 外壳照着网页端（client/src/layouts）来的：顶部一排菜单 + 右上角用户区。
// 默认直接进主界面，登录页要用户点了「登录」、或点「后台管理」才出现
// —— 本地那三块不依赖后台，没必要逼人先登录。
//
// 结构和以前一样分两层：Shell 管 provider（主题 + 语言 + 会话），Inner 才是界面。
// 分成两层是因为 ConfigProvider / LocaleProvider 要包住用它们的组件。

import { useCallback, useEffect, useState } from 'react';
import {
  App as AntApp,
  Alert,
  Button,
  ConfigProvider,
  Dropdown,
  Layout,
  Menu,
  Space,
  Spin,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  ApiOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  LoginOutlined,
  LogoutOutlined,
  MoonOutlined,
  PictureOutlined,
  SunOutlined,
  TranslationOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import WordImagesPanel from './WordImagesPanel';
import TranscriptPanel from './TranscriptPanel';
import SongsPanel from './SongsPanel';
import AdminPanel from './admin/AdminPanel';
import LoginPage from './LoginPage';
import { SessionProvider, useSession } from './SessionContext';
import { LocaleProvider, useI18n } from './LocaleProvider';
import { api } from './admin/apiClient';

const { Title } = Typography;
const { Header, Content } = Layout;

export default function App() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}

function Shell() {
  const { settings } = useSession();
  const themeMode = settings?.theme === 'dark' ? 'dark' : 'light';
  const locale = settings?.locale === 'en' ? 'en' : 'zh';

  return (
    <LocaleProvider locale={locale}>
      <ConfigProvider
        locale={locale === 'en' ? enUS : zhCN}
        theme={{
          algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: { colorPrimary: '#ff4d4f', colorLink: '#ff4d4f' },
        }}
      >
        <Inner themeMode={themeMode} />
      </ConfigProvider>
    </LocaleProvider>
  );
}

function Inner({ themeMode }) {
  const { message } = AntApp.useApp();
  const { settings, ready, error, loggedIn, logout, saveSettings } = useSession();
  const { locale, t } = useI18n();
  const [env, setEnv] = useState(null);
  const [bridgeError, setBridgeError] = useState(null);
  const [current, setCurrent] = useState('words');
  const [view, setView] = useState('main'); // 'main' | 'login'
  const [loginHint, setLoginHint] = useState(null);
  const [pendingAfterLogin, setPendingAfterLogin] = useState(null); // 登录后要跳去的菜单项

  useEffect(() => {
    if (!window.api) {
      setBridgeError(t('App.bridgeError'));
      return;
    }
    window.api.env().then(setEnv).catch((e) => setBridgeError(String(e?.message ?? e)));
  }, [t]);

  const toggleTheme = useCallback(async () => {
    await saveSettings({ theme: themeMode === 'dark' ? 'light' : 'dark' });
  }, [themeMode, saveSettings]);

  const toggleLocale = useCallback(async () => {
    await saveSettings({ locale: locale === 'zh' ? 'en' : 'zh' });
  }, [locale, saveSettings]);

  const openLogin = useCallback(
    (key) => {
      setLoginHint(key ? t(key) : null);
      // 因为「后台管理」被拦下来的，登完直接送进去
      setPendingAfterLogin(key ? 'admin' : null);
      setView('login');
    },
    [t],
  );

  const handleMenuClick = useCallback(
    ({ key }) => {
      // 「后台管理」要调后台接口，没登录就先把登录页顶上来，登完自动进去
      if (key === 'admin' && !loggedIn) {
        openLogin('App.loginRequired');
        return;
      }
      setCurrent(key);
      setView('main');
    },
    [loggedIn, openLogin],
  );

  // 停在「后台管理」却没了登录态（token 过期被踢回来）→ 直接弹登录页
  useEffect(() => {
    if (!ready || loggedIn || current !== 'admin') return;
    openLogin('App.sessionExpired');
  }, [ready, loggedIn, current, openLogin]);

  // 菜单里的「检查后台服务」：跟网页端头部那项一个意思 —— 后台通不通要能第一时间确认
  const checkBackend = useCallback(async () => {
    try {
      const res = await api.get('/api/health');
      if (res.ok) {
        message.success(`${t('App.backendOk')}：${res.data?.status ?? ''} ${res.data?.version ?? ''}`.trim());
      } else {
        message.error(`${t('App.backendHttpStatus')} ${res.status}`);
      }
    } catch (e) {
      message.error(String(e?.message ?? e));
    }
  }, [message, t]);

  const handleLogout = useCallback(async () => {
    // 退在「后台管理」上的话先挪回本地面板，免得底下挂着一块没 token 的界面
    setCurrent((prev) => (prev === 'admin' ? 'words' : prev));
    setView('main');
    await logout();
    message.success(t('App.loggedOut'));
  }, [logout, message, t]);

  // 登录后显示名字（有昵称用昵称，没有就退回邮箱）
  const displayName = settings?.adminName || settings?.adminEmail || t('App.account');

  const navItems = [
    { key: 'words', icon: <PictureOutlined />, label: t('App.menu.words') },
    { key: 'video', icon: <VideoCameraOutlined />, label: t('App.menu.video') },
    { key: 'songs', icon: <CustomerServiceOutlined />, label: t('App.menu.songs') },
    { key: 'admin', icon: <DashboardOutlined />, label: t('App.menu.admin') },
  ];

  const userMenuItems = [
    {
      key: 'who',
      icon: <UserOutlined />,
      label: (
        <div style={{ padding: '2px 0', cursor: 'default' }}>
          <div style={{ fontWeight: 500 }}>{displayName}</div>
          {settings?.adminName && settings?.adminEmail && (
            <div style={{ fontSize: 12, opacity: 0.65 }}>{settings.adminEmail}</div>
          )}
          {env && (
            <div style={{ fontSize: 12, opacity: 0.65 }}>
              Electron {env.electron} / Node {env.node}
            </div>
          )}
        </div>
      ),
    },
    { type: 'divider' },
    { key: 'health', icon: <ApiOutlined />, label: t('App.checkBackend'), onClick: checkBackend },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: t('App.logout'), onClick: handleLogout },
  ];

  // 没读完设置之前先转圈 —— 不然会闪一下再跳进去
  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (error || bridgeError) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={error || bridgeError} showIcon />
      </div>
    );
  }

  return view === 'login' ? (
    <LoginPage
      hint={loginHint}
      onSuccess={() => {
        if (pendingAfterLogin) setCurrent(pendingAfterLogin);
        setPendingAfterLogin(null);
        setView('main');
      }}
      onCancel={() => {
        setPendingAfterLogin(null);
        setView('main');
      }}
    />
  ) : (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          height: 56,
          lineHeight: 'normal',
          background: themeMode === 'dark' ? '#141414' : '#e6f7ff',
          borderBottom: `1px solid ${themeMode === 'dark' ? '#303030' : '#91d5ff'}`,
        }}
      >
        <Title level={5} style={{ margin: 0, marginRight: 24, whiteSpace: 'nowrap' }}>
          OpenEDU Tools
        </Title>

        <Menu
          mode="horizontal"
          selectedKeys={[current]}
          items={navItems}
          onClick={handleMenuClick}
          style={{ flex: 1, minWidth: 0, background: 'transparent', borderBottom: 'none' }}
        />

        {/* 数据和偏好都不占版面：数据根目录是 settings.json 里的配置项；
            语言、主题是个人偏好，没登录也要能改，所以常驻在这里 */}
        <Space size={4} style={{ flexShrink: 0 }}>
          <Tooltip title={locale === 'zh' ? 'English' : '中文'}>
            <Button size="small" icon={<TranslationOutlined />} onClick={toggleLocale}>
              {locale === 'zh' ? 'EN' : '中'}
            </Button>
          </Tooltip>
          <Tooltip title={themeMode === 'light' ? t('App.theme.dark') : t('App.theme.light')}>
            <Button
              size="small"
              icon={themeMode === 'light' ? <MoonOutlined /> : <SunOutlined />}
              onClick={toggleTheme}
            />
          </Tooltip>
          {loggedIn ? (
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <Button size="small" icon={<UserOutlined />}>
                {displayName}
              </Button>
            </Dropdown>
          ) : (
            <Button size="small" icon={<LoginOutlined />} onClick={() => openLogin(null)}>
              {t('App.login')}
            </Button>
          )}
        </Space>
      </Header>

      <Content style={{ padding: 16 }}>
        {current === 'words' && <WordImagesPanel dataRoot={settings?.dataRoot} />}
        {current === 'video' && <TranscriptPanel dataRoot={settings?.dataRoot} />}
        {current === 'songs' && <SongsPanel dataRoot={settings?.dataRoot} />}
        {current === 'admin' && <AdminPanel />}
      </Content>
    </Layout>
  );
}
