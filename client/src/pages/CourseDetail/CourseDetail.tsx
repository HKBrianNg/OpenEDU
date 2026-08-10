import { getLocalizedValue } from './utils';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Spin, Button, Collapse, Space, Card, Tooltip, Switch, Drawer } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, QuestionCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SoundOutlined, EyeInvisibleOutlined, EyeOutlined, MenuOutlined, AudioOutlined } from '@ant-design/icons';
import { getCourseData } from '../../api/coursesData';
import type { CourseData, Lesson } from '../../mock/coursesData';
import { useLocale } from '../../store/LocaleContext';
import AudioLesson from '../../components/AudioLesson';
import ArticleLesson from '../../components/ArticleLesson';

const { Title, Text, Paragraph } = Typography;

import { lessonIconMap } from './config';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();

  // 页面调度基础状态
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [blurContent, setBlurContent] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    return localStorage.getItem('autoSpeak') === 'true';
  });

  const handleAutoSpeakChange = (checked: boolean) => {
    setAutoSpeak(checked);
    localStorage.setItem('autoSpeak', String(checked));
  };

  // 窗口尺寸监听
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
        setSidebarDrawerOpen(false);
      } else {
        setShowSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 加载课程数据
  useEffect(() => {
    if (!id) return;
    getCourseData(id).then(data => {
      setCourse(data);
      setLoading(false);
      if (data?.chapters.length) {
        setExpandedChapters([data.chapters[0].id]);
        setCurrentLesson(data.chapters[0].lessons[0]);
      }
    });
  }, [id]);

  // 切换课时
  const handleLessonClick = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    if (isMobile) setSidebarDrawerOpen(false);
  };

  // 页面全局销毁清理语音朗读
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // 侧边栏目录JSX（修复：Collapse改为自闭合，onClick添加花括号和分号）
  const sidebarContent = (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('detail.catalog')}</span>
          <Button
            type="text"
            size="small"
            icon={expandedChapters.length === course?.chapters.length ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={() => {
              if (expandedChapters.length === course?.chapters.length) {
                setExpandedChapters([]);
              } else {
                setExpandedChapters(course?.chapters.map(ch => ch.id) || []);
              }
            }}
          />
        </div>
      }
      styles={{ body: { maxHeight: isMobile ? 'calc(100vh - 160px)' : 'calc(100vh - 256px)', overflowY: 'auto' } }}
    >
      <Collapse
        ghost
        activeKey={expandedChapters}
        onChange={(keys) => setExpandedChapters(keys as string[])}
        items={course?.chapters.map(chapter => ({
          key: chapter.id,
          label: (
            <Space>
              <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>{chapter.title}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>({chapter.lessons.length})</Text>
            </Space>
          ),
          children: (
            <div>
              {chapter.lessons.map((lesson: Lesson) => (
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
                    backgroundColor: currentLesson?.id === lesson.id ? '#e6f7ff' : 'transparent',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (currentLesson?.id !== lesson.id) e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    if (currentLesson?.id !== lesson.id) e.currentTarget.style.backgroundColor = 'transparent';
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
      {/* 顶部标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: isMobile ? 3 : 7 }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => window.history.back()}
          style={{ padding: 0, marginRight: 8, fontSize: isMobile ? 13 : 14 }}
        >
          {t('detail.back')}
        </Button>
        {isMobile ? (
          <>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setSidebarDrawerOpen(true)}
              style={{ marginRight: 8 }}
            />
            <Title level={4} style={{ margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {getLocalizedValue(course.title, locale)}
            </Title>
          </>
        ) : (
          <>
            <Tooltip title={showSidebar ? t('detail.hideCatalog') : t('detail.showCatalog')}>
              <Button
                type="text"
                icon={showSidebar ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                onClick={() => setShowSidebar(!showSidebar)}
              />
            </Tooltip>
            <Title level={2} style={{ margin: 0, marginLeft: 16 }}>
              {getLocalizedValue(course.title, locale)}
            </Title>
            <Paragraph
              type="secondary"
              style={{
                margin: 0,
                marginLeft: 16,
                fontSize: 14,
                lineHeight: '40px',
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {getLocalizedValue(course.description, locale)}
            </Paragraph>
          </>
        )}
      </div>

      {/* 移动端抽屉目录 */}
      {isMobile && (
        <Drawer
          title={t('detail.catalog')}
          placement="left"
          open={sidebarDrawerOpen}
          onClose={() => setSidebarDrawerOpen(false)}
        >
          {sidebarContent}
        </Drawer>
      )}

      <div style={{ display: 'flex', gap: isMobile ? 0 : 26, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* PC侧边栏 */}
        {!isMobile && showSidebar && (
          <div style={{ width: 390, flexShrink: 0 }}>
            {sidebarContent}
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

        {/* 右侧内容区 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 移动端设置卡片 */}
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
              <a href={currentLesson.lessonUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', textAlign: 'center' }}>
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