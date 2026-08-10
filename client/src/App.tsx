import { useState, Suspense, lazy } from 'react';
import { ConfigProvider, theme, Spin } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/index';
import {CourseProvider} from './store/courseStore';
import { LocaleProvider } from './store/LocaleContext';

// 懒加载页面统一管理
const Home = lazy(() => import('./pages/Home.tsx'));
const Courses = lazy(() => import('./pages/Courses.tsx'));
const CourseDetail = lazy(() => import('./pages/CourseDetail.tsx'));
const About = lazy(() => import('./pages/About.tsx'));
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
        {/* 全局状态上下文 */}
        <LocaleProvider>
          <CourseProvider>
            <MainLayout
              currentTheme={currentTheme}
              setCurrentTheme={setCurrentTheme}
            >
              {/* Suspense 只包裹路由页面，布局常驻不刷新 */}
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/courses/:id" element={<CourseDetail />} />
                  <Route path="/about" element={<About />} />
                  {/* 404兜底路由 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </MainLayout>
          </CourseProvider>
        </LocaleProvider>
      </Router>
    </ConfigProvider>
  );
}

export default App;
