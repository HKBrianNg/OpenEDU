import React, { useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/index';
import CourseProvider from './store/CourseProvider';
import Home from './pages/Home.tsx';
import Courses from './pages/Courses.tsx';
import CourseDetail from './pages/CourseDetail.tsx';

function App() {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#ff4d4f',        // 亮色主色：亮红
          colorLink: '#ff4d4f',            // 链接颜色
          colorSuccess: '#52c41a',         // 成功绿
          colorWarning: '#faad14',         // 警告黄
          colorError: '#ff4d4f',           // 错误红
          borderRadius: 8,                 // 圆角
          fontSize: 14,                    // 字号
        },
      }}
    >
      <Router>
        <CourseProvider>
          <MainLayout currentTheme={currentTheme} setCurrentTheme={setCurrentTheme}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/about" element={<div>关于我们（待开发）</div>} />
            </Routes>
          </MainLayout>
        </CourseProvider>
      </Router>
    </ConfigProvider>
  );
}

export default App;