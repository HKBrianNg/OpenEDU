import { useState, Suspense, lazy } from 'react';
import { ConfigProvider, theme, Spin } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/index';
import CourseProvider from './store/CourseProvider';
import { LocaleProvider } from './store/LocaleContext';

// 使用 lazy 懒加载页面组件
const Home = lazy(() => import('./pages/Home.tsx'));
const Courses = lazy(() => import('./pages/Courses.tsx'));
const CourseDetail = lazy(() => import('./pages/CourseDetail.tsx'));

// 加载时的 fallback 组件
const LoadingFallback = () => (
  <div style={{ textAlign: 'center', padding: '100px 0' }}>
    <Spin size="large" />
  </div>
);

function App() {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  return (
    <ConfigProvider
      theme={{
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
      }}
    >
      <Router>
        <LocaleProvider>
          <CourseProvider>
            <MainLayout currentTheme={currentTheme} setCurrentTheme={setCurrentTheme}>
              {/* 用 Suspense 包裹所有懒加载路由 */}
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/courses/:id" element={<CourseDetail />} />
                  <Route path="/about" element={<div>关于我们（待开发）</div>} />
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