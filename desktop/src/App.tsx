import { ConfigProvider, theme, App as AntdApp } from 'antd';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ThemeProvider, useTheme } from './store/ThemeContext';
import { LocaleProvider } from './store/LocaleContext';
import { AuthProvider } from './store/AuthContext';

function AppInner() {
  const { isDark } = useTheme();

  const baseToken = {
    colorPrimary: '#0066cc',
    borderRadius: 6,
  };

  const lightToken = {
    ...baseToken,
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorTextBase: '#1f2937',
    colorTextSecondary: '#6b7280',
  };

  const darkToken = {
    ...baseToken,
    colorPrimary: '#4096ff',
    colorBgBase: '#121417',
    colorBgContainer: '#1c2026',
    colorTextBase: '#e5e7eb',
    colorTextSecondary: '#9ca3af',
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: isDark ? darkToken : lightToken,
      }}
    >
      <AntdApp> {/* ← 加这层，消除 antd message 静态调用警告 */}
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <AuthProvider> {/* ← 加这层，全局登录态可用 */}
          <AppInner />
        </AuthProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}