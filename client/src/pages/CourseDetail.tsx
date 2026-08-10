import React, { useEffect, useState, useCallback } from 'react';

import { useParams } from 'react-router-dom';

import { Typography, Spin, Button, Collapse, Space, Card, Tooltip, Input, Alert, Switch, Drawer } from 'antd';

import { ArrowLeftOutlined, PlayCircleOutlined, FileTextOutlined, QuestionCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SoundOutlined, CheckOutlined, CloseOutlined, EyeInvisibleOutlined, EyeOutlined, MenuOutlined, AudioOutlined } from '@ant-design/icons';

import { getCourseData } from '../api/coursesData';

import type { CourseData, Lesson } from '../mock/coursesData';

import { useLocale } from '../store/LocaleContext';

import AudioLesson from '../components/AudioLesson';

const { Title, Text, Paragraph } = Typography;

// 工具函数：获取多语言字段的值
function getLocalizedValue(value: any, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] || value.zh || ''
}

const lessonIconMap: Record<string, React.ReactNode> = {
  video: <PlayCircleOutlined style={{ color: '#1890ff' }} />,
  article: <FileTextOutlined style={{ color: '#52c41a' }} />,
  quiz: <QuestionCircleOutlined style={{ color: '#faad14' }} />,
  audio: <AudioOutlined style={{ color: '#722ed1' }} />,
};

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [blurContent, setBlurContent] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    return localStorage.getItem('autoSpeak') === 'true';
  });

  const handleAutoSpeakChange = (checked: boolean) => {
    setAutoSpeak(checked);
    localStorage.setItem('autoSpeak', String(checked));
  };

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

  useEffect(() => {
    if (autoSpeak && currentLesson && currentLesson.type === 'article' && currentLesson.content) {
      const timer = setTimeout(() => {
        if (isSpeaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
        const utterance = new SpeechSynthesisUtterance(currentLesson.content);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        utterance.pitch = 1;
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    }
  }, [autoSpeak, currentLesson]);

  const handleLessonClick = (lesson: Lesson) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setCurrentLesson(lesson);
    setUserInput('');
    setFeedback(null);
    if (isMobile) {
      setSidebarDrawerOpen(false);
    }
    console.log('[DEBUG] currentLesson:', currentLesson);
    console.log('[DEBUG] content:', currentLesson?.content);
  };

  const handleSpeak = useCallback(() => {
    if (!currentLesson?.content) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(currentLesson.content);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [currentLesson, isSpeaking]);

  const checkAnswer = useCallback(() => {
    if (!currentLesson?.content || !userInput.trim()) return;
    const userTrimmed = userInput.trim().toLowerCase();
    const originalTrimmed = currentLesson.content.trim().toLowerCase();
    if (userTrimmed === originalTrimmed) {
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }
  }, [currentLesson, userInput]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
    if (feedback) {
      setFeedback(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      checkAnswer();
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // 侧边栏内容
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
                setExpandedChapters([])
              } else {
                setExpandedChapters(course?.chapters.map(ch => ch.id) || [])
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
                    if (currentLesson?.id !== lesson.id) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentLesson?.id !== lesson.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
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
          size="default"
        >
          {sidebarContent}
        </Drawer>
      )}

      <div style={{ display: 'flex', gap: isMobile ? 0 : 26, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* PC端侧边栏 */}
        {!isMobile && showSidebar && (
          <div style={{ width: 390, flexShrink: 0, transition: 'width 0.25s' }}>
            {sidebarContent}
            {/* 侧边栏底部设置区 */}
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
          {/* 移动端设置区 */}
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

          {/* 【拆分后】仅传递原始数据，歌词拉取、状态全部交给子组件 */}
          {currentLesson && currentLesson.type === 'audio' && (
            <AudioLesson
              audioUrl={currentLesson.lessonUrl || ''}
              lyricSource={currentLesson.content || ''}
              title={currentLesson.title}
            />
          )}

          {currentLesson && currentLesson.type === 'article' && (
            <Card styles={{ body: { padding: isMobile ? 12 : 18 } }}>
              <div style={{
                display: 'flex',
                gap: isMobile ? 12 : 33,
                alignItems: 'flex-start',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                {currentLesson.lessonUrl && (
                  <img
                    src={currentLesson.lessonUrl}
                    alt={currentLesson.title}
                    style={{
                      width: isMobile ? '100%' : 440,
                      maxWidth: isMobile ? 540 : 620,
                      height: isMobile ? 220 : 340,
                      borderRadius: 8,
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <Paragraph
                    style={{
                      fontSize: isMobile ? 15 : 17,
                      lineHeight: 2,
                      margin: 0,
                      filter: blurContent ? 'blur(8px)' : 'none',
                      transition: 'filter 0.35s',
                      userSelect: blurContent ? 'none' : 'auto',
                    }}
                  >
                    {currentLesson.content}
                  </Paragraph>
                </div>
              </div>
              <div style={{
                marginTop: isMobile ? 12 : 18,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 12 : 0,
              }}>
                <Button
                  type="primary"
                  icon={<SoundOutlined />}
                  onClick={handleSpeak}
                  loading={isSpeaking}
                  size={isMobile ? 'small' : 'middle'}
                  style={{ width: isMobile ? '100%' : 'auto' }}
                >
                  {isSpeaking ? t('detail.speaking') : t('detail.speak')}
                </Button>
              </div>
              <div style={{ marginTop: isMobile ? 14 : 20 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Input.TextArea
                    rows={isMobile ? 2 : 2}
                    placeholder={t('detail.input.placeholder')}
                    value={userInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    style={{ flex: 1, fontSize: isMobile ? 14 : 15 }}
                    status={feedback === 'incorrect' ? 'error' : feedback === 'correct' ? 'success' : undefined}
                  />

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    paddingTop: 6,
                    paddingBottom: 4
                  }}>
                    {feedback === 'correct' ? (
                      <CheckOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                    ) : feedback === 'incorrect' ? (
                      <CloseOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                    ) : null}
                  </div>
                </div>
                {feedback === 'correct' && (
                  <Alert
                    message={t('detail.correct')}
                    type="success"
                    showIcon
                    closable
                    style={{ marginTop: 8, fontSize: isMobile ? 13 : 15 }}
                  />
                )}
                {feedback === 'incorrect' && (
                  <Alert
                    message={
                      <span style={{ fontSize: isMobile ? 13 : 15 }}>
                        {t('detail.incorrect')}<br />
                        <strong>{t('detail.original')}</strong>{currentLesson.content}
                      </span>
                    }
                    type="warning"
                    showIcon
                    closable
                    style={{ marginTop: 8 }}
                  />
                )}
              </div>
            </Card>
          )}

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
