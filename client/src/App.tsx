// client/src/App.tsx

import { Suspense, lazy } from 'react';
import { ConfigProvider, App as AntApp, theme, Spin } from 'antd';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/index';
import { LocaleProvider } from './store/LocaleContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ThemeProvider, useTheme } from './store/ThemeContext';
import { GameStatusProvider } from './store/GameStatusContext';

// 懒加载页面统一管理
const Home = lazy(() => import('./pages/Home.tsx'));
const Books = lazy(() => import('./pages/Books.tsx'));
const Music = lazy(() => import('./pages/Music.tsx'));
const Games = lazy(() => import('./pages/Games.tsx'));
const Lab = lazy(() => import('./pages/Lab.tsx'));
const Login = lazy(() => import('./pages/Login.tsx'));
const Register = lazy(() => import('./pages/Register.tsx'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.tsx'));
const Preferences = lazy(() => import('./pages/Preferences.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const NotFound = lazy(() => import('./pages/NotFound.tsx'));

// 全局页面加载占位
const LoadingFallback = () => (
  <div style={{ textAlign: 'center', padding: '100px 0' }}>
    <Spin size="large" />
  </div>
);

// 路由守卫：需要登录
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// 路由守卫：需要 admin 权限
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// 内部组件：使用全局主题
function AppContent() {
  const { theme: currentTheme } = useTheme();

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
            <GameStatusProvider>
              <LocaleProvider>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* 独立布局页面（无 Header）：邮箱验证 */}
                    <Route path="/verify-email" element={<VerifyEmail />} />

                    {/* MainLayout 包裹的页面（含 Header） */}
                    <Route element={<MainLayout />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/books" element={<Books />} />
                      <Route path="/music" element={<Music />} />
                      <Route path="/games" element={<Games />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      
                      {/* 偏好设置：需要登录 */}
                      <Route path="/preferences" element={
                        <ProtectedRoute>
                          <Preferences />
                        </ProtectedRoute>
                      } />
                      
                      {/* AI Lab：需要 admin 权限 */}
                      <Route path="/lab" element={
                        <AdminRoute>
                          <Lab />
                        </AdminRoute>
                      } />
                      
                      {/* Dashboard：需要 admin 权限 */}
                      <Route path="/dashboard" element={
                        <AdminRoute>
                          <Dashboard />
                        </AdminRoute>
                      } />
                    </Route>

                    {/* 404兜底路由 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </LocaleProvider>
            </GameStatusProvider>
          </AuthProvider>
        </Router>
      </AntApp>
    </ConfigProvider>
  );
}

// 根组件：包裹全局主题 Provider
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}