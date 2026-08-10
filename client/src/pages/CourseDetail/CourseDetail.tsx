import { getLocalizedValue } from './utils';
import { useCourseDetail } from './hooks/useCourseDetail';

// 页面私有拆分组件
import CourseSidebar from './components/CourseSidebar';
import CourseHeader from './components/CourseHeader';
import CourseSettingPanel from './components/CourseSettingPanel';
import LessonRenderer from './components/LessonRenderer';

import React from 'react';
import { Typography, Spin, Drawer } from 'antd';


const { Text } = Typography;

const CourseDetail: React.FC = () => {
  const {
    course,
    loading,
    currentLesson,
    expandedChapters,
    showSidebar,
    sidebarDrawerOpen,
    blurContent,
    isMobile,
    autoSpeak,
    t,
    locale,
    setBlurContent,
    setExpandedChapters,
    setShowSidebar,
    setSidebarDrawerOpen,
    handleAutoSpeakChange,
    handleLessonClick,
    toggleAllChapterExpand,
  } = useCourseDetail();

  // 加载态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 无课程数据
  if (!course) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Text type="danger">{t('detail.notFound')}</Text>
      </div>
    );
  }

  return (
    <div style={{
      padding: isMobile ? 5 : 10,
      maxWidth: 1440,
      margin: '0 auto'
    }}>
      {/* 页面头部标题栏 */}
      <CourseHeader
        isMobile={isMobile}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onOpenMobileDrawer={() => setSidebarDrawerOpen(true)}
        courseTitle={getLocalizedValue(course.title, locale)}
        courseDesc={getLocalizedValue(course.description, locale)}
        t={t}
      />

      {/* 移动端侧边目录抽屉 */}
      {isMobile && (
        <Drawer
          title={t('detail.catalog')}
          placement="left"
          open={sidebarDrawerOpen}
          onClose={() => setSidebarDrawerOpen(false)}
          width={320}
        >
          <CourseSidebar
            course={course}
            isMobile={isMobile}
            expandedChapters={expandedChapters}
            currentLesson={currentLesson}
            t={t}
            setExpandedChapters={setExpandedChapters}
            handleLessonClick={handleLessonClick}
            toggleAllChapterExpand={toggleAllChapterExpand}
          />
        </Drawer>
      )}

      <div style={{
        display: 'flex',
        gap: isMobile ? 0 : 26,
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        {/* PC端左侧侧边栏 */}
        {!isMobile && showSidebar && (
          <div style={{ width: 390, flexShrink: 0 }}>
            <CourseSidebar
              course={course}
              isMobile={isMobile}
              expandedChapters={expandedChapters}
              currentLesson={currentLesson}
              t={t}
              setExpandedChapters={setExpandedChapters}
              handleLessonClick={handleLessonClick}
              toggleAllChapterExpand={toggleAllChapterExpand}
            />
            {/* 音频/文字设置面板 */}
            <CourseSettingPanel
              autoSpeak={autoSpeak}
              blurContent={blurContent}
              isMobile={isMobile}
              t={t}
              onAutoSpeakChange={handleAutoSpeakChange}
              onBlurContentChange={setBlurContent}
            />
          </div>
        )}

        {/* 主内容区域 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 移动端顶部设置面板 */}
          {isMobile && (
            <CourseSettingPanel
              autoSpeak={autoSpeak}
              blurContent={blurContent}
              isMobile={isMobile}
              t={t}
              onAutoSpeakChange={handleAutoSpeakChange}
              onBlurContentChange={setBlurContent}
            />
          )}

          {/* 统一课时渲染组件（已修复title undefined类型问题） */}
          <LessonRenderer
            currentLesson={currentLesson}
            isMobile={isMobile}
            blurContent={blurContent}
            t={t}
          />
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
