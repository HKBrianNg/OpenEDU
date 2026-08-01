//import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/index';
import CourseProvider from './store/CourseProvider';
import Home from './pages/Home.tsx';
import Courses from './pages/Courses.tsx';
import CourseDetail from './pages/CourseDetail.tsx';

function App() {
  return (
    <Router>
      <CourseProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/about" element={<div>关于我们（待开发）</div>} />
          </Routes>
        </MainLayout>
      </CourseProvider>
    </Router>
  );
}

export default App;