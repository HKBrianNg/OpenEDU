import { ConfigProvider, theme } from 'antd';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useThemeMode } from './hooks/useThemeMode';

export default function App() {
  const { isDark } = useThemeMode();

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
