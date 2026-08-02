import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Spin, Button, Collapse, List, Space, Card, Tooltip, Input, Alert, Switch, Drawer } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, FileTextOutlined, QuestionCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SoundOutlined, CheckOutlined, CloseOutlined, EyeInvisibleOutlined, EyeOutlined, MenuOutlined } from '@ant-design/icons';
import { getCourseData } from '../api/coursesData';
import type { CourseData, Lesson } from '../mock/coursesData';

const { Title, Text, Paragraph } = Typography;

const lessonIconMap: Record<string, React.ReactNode> = {
  video: <PlayCircleOutlined style={{ color: '#1890ff' }} />,
  article: <FileTextOutlined style={{ color: '#52c41a' }} />,
  quiz: <QuestionCircleOutlined style={{ color: '#faad14' }} />,
};

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
      title="课程目录"
      styles={{ body: { maxHeight: isMobile ? 'calc(100vh - 130px)' : 'calc(100vh - 205px)', overflowY: 'auto' } }}
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
              <Text type="secondary" style={{ fontSize: 12 }}>({chapter.lessons.length} 节)</Text>
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
        <Text type="danger">课程不存在</Text>
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
          返回
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
            <Tooltip title={showSidebar ? '隐藏目录' : '显示目录'}>
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
          title="课程目录"
          placement="left"
          open={sidebarDrawerOpen}
          onClose={() => setSidebarDrawerOpen(false)}
          width={300}
        >
          {sidebarContent}
        </Drawer>
      )}

      <div style={{ display: 'flex', gap: isMobile ? 0 : 24, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* PC端侧边栏 */}
        {!isMobile && showSidebar && (
          <div style={{ width: 340, flexShrink: 0, transition: 'width 0.3s' }}>
            {sidebarContent}
          </div>
        )}

        {/* 右侧内容区 */}
        <div style={{ flex: 1 }}>
          {currentLesson && currentLesson.type === 'video' && (
            <div style={{
              background: '#000', 
              height: isMobile ? 220 : 470, 
              display: 'flex',
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#fff', 
              borderRadius: 8,
            }}>
              <a href={currentLesson.lessonUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', textAlign: 'center' }}>
                <PlayCircleOutlined style={{ fontSize: isMobile ? 44 : 66, cursor: 'pointer' }} />
                <div style={{ marginTop: 8, fontSize: isMobile ? 12 : 14 }}>点击播放视频</div>
              </a>
            </div>
          )}
          {currentLesson && currentLesson.type === 'article' && (
            <Card styles={{ body: { padding: isMobile ? 12 : 24 } }}>
              <div style={{ 
                display: 'flex', 
                gap: isMobile ? 12 : 24, 
                alignItems: 'flex-start',
                flexDirection: isMobile ? 'column' : 'row' 
              }}>
                {currentLesson.lessonUrl && (
                  <img
                    src={currentLesson.lessonUrl}
                    alt={currentLesson.title}
                    style={{ 
                      width: isMobile ? '100%' : 330, 
                      maxWidth: isMobile ? 400 : 330,
                      height: isMobile ? 180 : 260, 
                      borderRadius: 8, 
                      objectFit: 'cover', 
                      flexShrink: 0 
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <Paragraph
                    style={{
                      fontSize: isMobile ? 14 : 16,
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
                marginTop: isMobile ? 12 : 16, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 10 : 0,
              }}>
                <Space size={isMobile ? 4 : 8}>
                  <EyeInvisibleOutlined style={{ fontSize: isMobile ? 12 : 14, color: blurContent ? '#1890ff' : '#bbb' }} />
                  <Switch
                    checked={blurContent}
                    onChange={setBlurContent}
                    checkedChildren={<EyeOutlined />}
                    unCheckedChildren={<EyeInvisibleOutlined />}
                    size="small"
                  />
                  <EyeOutlined style={{ fontSize: isMobile ? 12 : 14, color: blurContent ? '#bbb' : '#1890ff' }} />
                  <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>虚化原文</Text>
                </Space>

                <Button
                  type="primary"
                  icon={<SoundOutlined />}
                  onClick={handleSpeak}
                  loading={isSpeaking}
                  size={isMobile ? 'small' : 'middle'}
                  style={{ width: isMobile ? '100%' : 'auto' }}
                >
                  {isSpeaking ? '朗读中...' : '朗读'}
                </Button>
              </div>

              <div style={{ marginTop: isMobile ? 12 : 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Input.TextArea
                    rows={isMobile ? 2 : 2}
                    placeholder="输入你听到的内容，按 Enter 检查..."
                    value={userInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    style={{ flex: 1, fontSize: isMobile ? 13 : 14 }}
                    status={feedback === 'incorrect' ? 'error' : feedback === 'correct' ? 'success' : undefined}
                  />
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    paddingTop: 6,
                    paddingBottom: 4
                  }}>
                    {feedback === 'correct' ? (
                      <CheckOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                    ) : feedback === 'incorrect' ? (
                      <CloseOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                    ) : null}
                  </div>
                </div>

                {feedback === 'correct' && (
                  <Alert
                    message="完全正确！继续加油！"
                    type="success"
                    showIcon
                    closable
                    style={{ marginTop: 8, fontSize: isMobile ? 12 : 14 }}
                  />
                )}
                {feedback === 'incorrect' && (
                  <Alert
                    message={
                      <span style={{ fontSize: isMobile ? 12 : 14 }}>
                        再试一次，注意发音和单词顺序<br />
                        <strong>原文：</strong>{currentLesson.content}
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
              <div style={{ padding: isMobile ? 16 : 28, textAlign: 'center' }}>
                <QuestionCircleOutlined style={{ fontSize: isMobile ? 28 : 38, color: '#faad14' }} />
                <Title level={isMobile ? 5 : 4} style={{ marginTop: 10 }}>{currentLesson.content}</Title>
                {currentLesson.lessonUrl && (
                  <Button 
                    type="primary" 
                    size={isMobile ? 'middle' : 'large'} 
                    href={currentLesson.lessonUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    block={isMobile}
                  >
                    开始答题
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