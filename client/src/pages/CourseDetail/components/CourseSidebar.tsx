// client/src/pages/CourseDetail/components/CourseSidebar.tsx

import React from 'react';
import { Card, Collapse, Space, Button, Typography } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import type { CourseData, Lesson } from '../../../CoursesData';
import { getLocalizedValue } from '../utils'; // 改为使用 getLocalizedValue
import { lessonIconMap } from '../config';
import CourseSettingPanel from './CourseSettingPanel';

const { Text } = Typography;

export interface CourseSidebarProps {
  course: CourseData;
  isMobile: boolean;
  expandedChapters: string[];
  currentLesson: Lesson | null;
  t: (key: string) => string;
  setExpandedChapters: (keys: string[]) => void;
  handleLessonClick: (lesson: Lesson) => void;
  toggleAllChapterExpand: () => void;
  // 设置面板相关 props
  autoSpeak: boolean;
  blurContent: boolean;
  onAutoSpeakChange: (checked: boolean) => void;
  onBlurContentChange: (checked: boolean) => void;
  // 新增：当前语言
  locale: string;
}

const CourseSidebar: React.FC<CourseSidebarProps> = ({
  course,
  isMobile,
  expandedChapters,
  currentLesson,
  t,
  setExpandedChapters,
  handleLessonClick,
  toggleAllChapterExpand,
  autoSpeak,
  blurContent,
  onAutoSpeakChange,
  onBlurContentChange,
  locale, // 解构 locale
}) => {
  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('detail.catalog')}</span>
          <Button
            type="text"
            size="small"
            icon={expandedChapters.length === course.chapters.length ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={toggleAllChapterExpand}
          />
        </div>
      }
      styles={{
        body: {
          maxHeight: isMobile ? 'calc(100vh - 180px)' : 'calc(100vh - 220px)',
          overflowY: 'auto',
          padding: '12px 16px',
          flex: 1,
        },
      }}
    >
      <CourseSettingPanel
        autoSpeak={autoSpeak}
        blurContent={blurContent}
        isMobile={isMobile}
        t={t}
        onAutoSpeakChange={onAutoSpeakChange}
        onBlurContentChange={onBlurContentChange}
      />

      <Collapse
        ghost
        activeKey={expandedChapters}
        onChange={(keys) => setExpandedChapters(keys as string[])}
        items={course.chapters.map((chapter) => ({
          key: chapter.id,
          label: (
            <Space>
              <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
                {getLocalizedValue(chapter.title, locale)} {/* 使用 getLocalizedValue */}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({chapter.lessons.length})
              </Text>
            </Space>
          ),
          children: (
            <div>
              {chapter.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => handleLessonClick(lesson)}
                  style={{
                    cursor: 'pointer',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 4,
                    backgroundColor:
                      currentLesson?.id === lesson.id ? '#e6f7ff' : 'transparent',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (currentLesson?.id !== lesson.id)
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    if (currentLesson?.id !== lesson.id)
                      e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {lessonIconMap[lesson.type]}
                  <Text
                    style={{
                      fontSize: isMobile ? 13 : 14,
                      color: currentLesson?.id === lesson.id ? '#1890ff' : undefined,
                      fontWeight: currentLesson?.id === lesson.id ? 'bold' : undefined,
                    }}
                  >
                    {lesson.title}
                  </Text>
                </div>
              ))}
            </div>
          ),
        }))}
      />
    </Card>
  );
};

export default CourseSidebar;