import { getLocalizedValue } from './utils';
import { useCourseDetail } from './hooks/useCourseDetail';

// 页面私有组件
import CourseSidebar from './components/CourseSidebar';
import CourseHeader from './components/CourseHeader';

import React from 'react';
import { Typography, Spin, Button, Space, Card, Switch, Drawer } from 'antd';
import {
  PlayCircleOutlined,
  QuestionCircleOutlined,
  SoundOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  AudioOutlined
} from '@ant-design/icons';

// 全局公共组件
import AudioLesson from '../../components/AudioLesson';
import ArticleLesson from '../../components/ArticleLesson';

const { Title, Text } = Typography;

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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Text type="danger">{t('detail.notFound')}</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '5px' : '10px', maxWidth: 1440, margin: '0 auto' }}>
      {/* 顶部标题栏 - 已抽离独立组件 */}
      <CourseHeader
        isMobile={isMobile}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onOpenMobileDrawer={() => setSidebarDrawerOpen(true)}
        courseTitle={getLocalizedValue(course.title, locale)}
        courseDesc={getLocalizedValue(course.description, locale)}
        t={t}
      />

      {/* 移动端侧边抽屉 */}
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

      <div style={{ display: 'flex', gap: isMobile ? 0 : 26, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* PC端侧边目录栏 */}
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
            {/* 设置面板 - PC侧边底部 */}
            <Card size="small" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <AudioOutlined style={{ fontSize: 15, color: autoSpeak ? '#1890ff' : undefined }} />
                  <Text style={{ fontSize: 13 }}>{t('detail.autoSpeak')}</Text>
                  <Switch
                    checked={autoSpeak}
                    onChange={handleAutoSpeakChange}
                    checkedChildren={<SoundOutlined />}
                    unCheckedChildren={<AudioOutlined />}
                    size="small"
                  />
                </Space>
                <Space>
                  <EyeInvisibleOutlined style={{ fontSize: 13, color: blurContent ? '#1890ff' : '#bbb' }} />
                  <Text type="secondary" style={{ fontSize: 13 }}>{t('detail.blur')}</Text>
                  <Switch
                    checked={blurContent}
                    onChange={setBlurContent}
                    checkedChildren={<EyeOutlined />}
                    unCheckedChildren={<EyeInvisibleOutlined />}
                    size="small"
                  />
                </Space>
              </div>
            </Card>
          </div>
        )}

        {/* 主内容区域 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 移动端顶部设置面板 */}
          {isMobile && (
            <Card size="small" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <AudioOutlined style={{ fontSize: 13, color: autoSpeak ? '#1890ff' : undefined }} />
                  <Text style={{ fontSize: 13 }}>{t('detail.autoSpeak')}</Text>
                  <Switch
                    checked={autoSpeak}
                    onChange={handleAutoSpeakChange}
                    checkedChildren={<SoundOutlined />}
                    unCheckedChildren={<AudioOutlined />}
                    size="small"
                  />
                </Space>
                <Space>
                  <EyeInvisibleOutlined style={{ fontSize: 12, color: blurContent ? '#1890ff' : '#bbb' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('detail.blur')}</Text>
                  <Switch
                    checked={blurContent}
                    onChange={setBlurContent}
                    checkedChildren={<EyeOutlined />}
                    unCheckedChildren={<EyeInvisibleOutlined />}
                    size="small"
                  />
                </Space>
              </div>
            </Card>
          )}

          {/* Video课时 */}
          {currentLesson && currentLesson.type === 'video' && (
            <div style={{
              background: '#000',
              height: isMobile ? 240 : 520,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              borderRadius: 8,
            }}>
              <a
                href={currentLesson.lessonUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#fff', textDecoration: 'none', textAlign: 'center' }}
              >
                <PlayCircleOutlined style={{ fontSize: isMobile ? 44 : 72, cursor: 'pointer' }} />
                <div style={{ marginTop: 8, fontSize: isMobile ? 13 : 15 }}>{t('detail.video.play')}</div>
              </a>
            </div>
          )}

          {/* Audio课时 */}
          {currentLesson && currentLesson.type === 'audio' && (
            <AudioLesson
              audioUrl={currentLesson.lessonUrl || ''}
              lyricSource={currentLesson.content || ''}
              title={currentLesson.title}
            />
          )}

          {/* Article课时 */}
          {currentLesson && currentLesson.type === 'article' && (
            <ArticleLesson
              content={currentLesson.content || ""}
              lessonUrl={currentLesson.lessonUrl}
              title={currentLesson.title}
              isMobile={isMobile}
              blurContent={blurContent}
              t={t}
            />
          )}

          {/* Quiz课时 */}
          {currentLesson && currentLesson.type === 'quiz' && (
            <Card>
              <div style={{ padding: isMobile ? 28 : 56, textAlign: 'center' }}>
                <QuestionCircleOutlined style={{ fontSize: isMobile ? 36 : 50, color: '#faad14' }} />
                <Title level={isMobile ? 5 : 4} style={{ marginTop: 12 }}>{currentLesson.content}</Title>
                {currentLesson.lessonUrl && (
                  <Button
                    type="primary"
                    size={isMobile ? 'middle' : 'large'}
                    href={currentLesson.lessonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    block={isMobile}
                  >
                    {t('detail.startQuiz')}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
