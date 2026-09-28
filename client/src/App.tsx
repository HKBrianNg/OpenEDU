// client/src/App.tsx

import { useState, Suspense, lazy } from 'react';
import { ConfigProvider, App as AntApp, theme, Spin } from 'antd';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/index';
import { LocaleProvider } from './store/LocaleContext';
import { AuthProvider, useAuth } from './store/AuthContext';

// 懒加载页面统一管理
const Home = lazy(() => import('./pages/Home.tsx'));
const Books = lazy(() => import('./pages/Books.tsx'));
const Music = lazy(() => import('./pages/Music.tsx'));
const Games = lazy(() => import('./pages/Games.tsx'));
const Lab = lazy(() => import('./pages/Lab.tsx'));
const Login = lazy(() => import('./pages/Login.tsx'));
const Preferences = lazy(() => import('./pages/Preferences.tsx'));
const NotFound = lazy(() => import('./pages/NotFound.tsx'));

// 全局页面加载占位
const LoadingFallback = () => (
  <div style={{ textAlign: 'center', padding: '100px 0' }}>
    <Spin size="large" />
  </div>
);

// 路由守卫：需要 admin 权限
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  
  // 未登录 → 跳登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // 已登录但非 admin → 跳首页
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  const antdTheme = {
    algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#ff4d4f',
      colorLink: '#ff4d4f',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      borderRadius: 8,
      fontSize: 14,
    },
  };

  return (
    <ConfigProvider theme={antdTheme}>
      <AntApp>
        <Router>
          <AuthProvider>
            <LocaleProvider>
              <MainLayout currentTheme={currentTheme} setCurrentTheme={setCurrentTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* 登录页独立布局（无 Header） */}
                    <Route path="/login" element={<Login />} />

                    {/* 公开页面（无需登录） */}
                    <Route path="/" element={<Home />} />
                    <Route path="/books" element={<Books />} />
                    <Route path="/music" element={<Music />} />
                    <Route path="/games" element={<Games />} />

                    {/* 偏好设置：需要登录（但不要求 admin） */}
                    <Route path="/preferences" element={<Preferences />} />

                    {/* Lab：需要 admin 权限 */}
                    <Route path="/lab" element={
                      <AdminRoute>
                        <Lab />
                      </AdminRoute>
                    } />

                    {/* 404兜底路由 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </MainLayout>
            </LocaleProvider>
          </AuthProvider>
        </Router>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;