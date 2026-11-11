// desktop/src/App.tsx
import { ConfigProvider, theme } from 'antd';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ThemeProvider, useTheme } from './store/ThemeContext';
import { LocaleProvider } from './store/LocaleContext';

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
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </LocaleProvider>
  );
}