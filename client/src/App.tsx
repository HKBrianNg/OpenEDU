import { useState, Suspense, lazy } from 'react';
import { ConfigProvider, theme, Spin } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/index';
import { LocaleProvider } from './store/LocaleContext';
import { GameStatusProvider } from './store/GameStatusContext.tsx';

// 懒加载页面统一管理
const Home = lazy(() => import('./pages/Home.tsx'));
const Books = lazy(()=> import('./pages/Books.tsx'));
const Music = lazy(()=> import('./pages/Music.tsx'));
const Games = lazy(() => import('./pages/Games.tsx'));
const Lab = lazy(() => import('./pages/Lab.tsx'));
const NotFound = lazy(() => import('./pages/NotFound.tsx'));

// 全局页面加载占位
const LoadingFallback = () => (
  <div style={{ textAlign: 'center', padding: '100px 0' }}>
    <Spin size="large" />
  </div>
);

function App() {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  // antd 主题配置抽离，简洁易维护
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
      <Router>
        <GameStatusProvider>
          {/* 全局状态上下文 */}
          <LocaleProvider>
              <MainLayout
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
                >
                {/* Suspense 只包裹路由页面，布局常驻不刷新 */}
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/books" element={<Books />} />
                    <Route path="/music" element={<Music />} />
                    <Route path="/games" element={<Games />} />
                    <Route path="/lab" element={<Lab />} />
                    {/* 404兜底路由 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </MainLayout>
          </LocaleProvider>
        </GameStatusProvider>
      </Router>
    </ConfigProvider>
  );
}

export default App;
