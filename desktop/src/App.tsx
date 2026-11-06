import { ConfigProvider, theme } from 'antd';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './layouts/AppShell';
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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<div>Home</div>} />
            <Route path="/sports" element={<div>Sports</div>} />
            <Route path="/chinese" element={<div>中文</div>} />
            <Route path="/english" element={<div>英文</div>} />
            <Route path="/science" element={<div>Science</div>} />
            <Route path="/music" element={<div>Music</div>} />
            <Route path="/games" element={<div>Games</div>} />
            <Route path="/books" element={<div>Books</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
