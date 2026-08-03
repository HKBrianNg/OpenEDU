import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Spin, Button, Collapse, List, Space, Card, Tooltip, Input, Alert, Switch, Drawer } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, FileTextOutlined, QuestionCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SoundOutlined, CheckOutlined, CloseOutlined, EyeInvisibleOutlined, EyeOutlined, MenuOutlined, AudioOutlined } from '@ant-design/icons';
import { getCourseData } from '../api/coursesData';
import type { CourseData, Lesson } from '../mock/coursesData';
import { useLocale } from '../store/LocaleContext';

const { Title, Text, Paragraph } = Typography;

const lessonIconMap: Record<string, React.ReactNode> = {
  video: <PlayCircleOutlined style={{ color: '#1890ff' }} />,
  article: <FileTextOutlined style={{ color: '#52c41a' }} />,
  quiz: <QuestionCircleOutlined style={{ color: '#faad14' }} />,
};

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
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
  // 从 localStorage 读取自动朗读开关状态，默认为关闭
  const [autoSpeak, setAutoSpeak] = useState(() => {
    return localStorage.getItem('autoSpeak') === 'true';
  });

  // 当自动朗读开关变化时，保存到 localStorage
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

  // 当 currentLesson 变化时，如果开启了自动朗读且当前课程是文章类型，则自动朗读
  useEffect(() => {
    if (autoSpeak && currentLesson && currentLesson.type === 'article' && currentLesson.content) {
      // 延迟一点再开始朗读，确保 UI 已更新
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
      // 如果关闭了自动朗读，取消正在进行的朗读
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

  const sidebarContent = (
    <Card 
      title={t('detail.catalog')}
      styles={{ body: { maxHeight: isMobile ? 'calc(100vh - 130px)' : 'calc(100vh - 270px)', overflowY: 'auto' } }}
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
            <List
              dataSource={chapter.lessons}
              renderItem={(lesson: Lesson) => (
                <List.Item
                  onClick={() => handleLessonClick(lesson)}
                  style={{
                    cursor: 'pointer',
                    padding: '6px 0',
                  }}
                >
                  <Space>
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
                  </Space>
                </List.Item>
              )}
            />
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
    <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 顶部标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: isMobile ? 12 : 16 }}>
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
              {course.title}
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
            <Title level={2} style={{ margin: 0, marginLeft: 16 }}>{course.title}</Title>
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
              {course.description}
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

      <div style={{ display: 'flex', gap: isMobile ? 0 : 24, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* PC端侧边栏 */}
        {!isMobile && showSidebar && (
          <div style={{ width: 380, flexShrink: 0, transition: 'width 0.3s' }}>
            {sidebarContent}
            {/* 自动朗读开关放在侧边栏底部 */}
            <Card size="small" style={{ marginTop: 12 }}>
              <Space>
                <AudioOutlined style={{ fontSize: 16, color: autoSpeak ? '#1890ff' : undefined }} />
                <Text>{t('detail.autoSpeak')}</Text>
                <Switch
                  checked={autoSpeak}
                  onChange={handleAutoSpeakChange}
                  checkedChildren={<SoundOutlined />}
                  unCheckedChildren={<AudioOutlined />}
                />
              </Space>
            </Card>
          </div>
        )}

        {/* 右侧内容区 */}
        <div style={{ flex: 1 }}>
          {/* 移动端自动朗读开关（放在内容区顶部） */}
          {isMobile && (
            <Card size="small" style={{ marginBottom: 12 }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <AudioOutlined style={{ fontSize: 14, color: autoSpeak ? '#1890ff' : undefined }} />
                  <Text style={{ fontSize: 13 }}>{t('detail.autoSpeak')}</Text>
                </Space>
                <Switch
                  checked={autoSpeak}
                  onChange={handleAutoSpeakChange}
                  checkedChildren={<SoundOutlined />}
                  unCheckedChildren={<AudioOutlined />}
                  size="small"
                />
              </Space>
            </Card>
          )}

          {currentLesson && currentLesson.type === 'video' && (
            <div style={{
              background: '#000', 
              height: isMobile ? 250 : 500, 
              display: 'flex',
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#fff', 
              borderRadius: 8,
            }}>
              <a href={currentLesson.lessonUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', textAlign: 'center' }}>
                <PlayCircleOutlined style={{ fontSize: isMobile ? 48 : 76, cursor: 'pointer' }} />
                <div style={{ marginTop: 8, fontSize: isMobile ? 13 : 15 }}>{t('detail.video.play')}</div>
              </a>
            </div>
          )}
          {currentLesson && currentLesson.type === 'article' && (
            <Card styles={{ body: { padding: isMobile ? 14 : 30 } }}>
              <div style={{ 
                display: 'flex', 
                gap: isMobile ? 14 : 32, 
                alignItems: 'flex-start',
                flexDirection: isMobile ? 'column' : 'row' 
              }}>
                {currentLesson.lessonUrl && (
                  <img
                    src={currentLesson.lessonUrl}
                    alt={currentLesson.title}
                    style={{ 
                      width: isMobile ? '100%' : 460, 
                      maxWidth: isMobile ? 480 : 560,
                      height: isMobile ? 220 : 320, 
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
                marginTop: isMobile ? 14 : 22, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 12 : 0,
              }}>
                <Space size={isMobile ? 6 : 10}>
                  <EyeInvisibleOutlined style={{ fontSize: isMobile ? 13 : 15, color: blurContent ? '#1890ff' : '#bbb' }} />
                  <Switch
                    checked={blurContent}
                    onChange={setBlurContent}
                    checkedChildren={<EyeOutlined />}
                    unCheckedChildren={<EyeInvisibleOutlined />}
                    size="small"
                  />
                  <EyeOutlined style={{ fontSize: isMobile ? 13 : 15, color: blurContent ? '#bbb' : '#1890ff' }} />
                  <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13 }}>{t('detail.blur')}</Text>
                </Space>

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
              <div style={{ padding: isMobile ? 28 : 54, textAlign: 'center' }}>
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