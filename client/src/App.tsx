// client/src/App.tsx

import { Suspense, lazy } from 'react';
import { ConfigProvider, App as AntApp, theme, Spin } from 'antd';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/index';
import { LocaleProvider } from './store/LocaleContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ThemeProvider, useTheme } from './store/ThemeContext';

// 懒加载页面统一管理
const Home = lazy(() => import('./pages/Home.tsx'));
const Books = lazy(() => import('./pages/Books.tsx'));
const Music = lazy(() => import('./pages/Music.tsx'));
const Games = lazy(() => import('./pages/Games.tsx'));
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
// 未登录跳 /login 时携带当前位置（state.from），登录成功后跳回原页面
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
};

// 路由守卫：仅游客可访问（已登录访问 /login、/register 直接回首页）
const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
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

  // button.autoInsertSpace：antd 默认给「两字中文按钮」中间插空格（学习 → 学 习），
  // 中文按钮不需要这个，全局关掉
  return (
    <ConfigProvider theme={antdTheme} button={{ autoInsertSpace: false }}>
      <AntApp>
        <Router>
          <AuthProvider>
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
                    <Route path="/login" element={
                      <GuestRoute>
                        <Login />
                      </GuestRoute>
                    } />
                    <Route path="/register" element={
                      <GuestRoute>
                        <Register />
                      </GuestRoute>
                    } />
                    
                    {/* 偏好设置：需要登录 */}
                    <Route path="/preferences" element={
                      <ProtectedRoute>
                        <Preferences />
                      </ProtectedRoute>
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