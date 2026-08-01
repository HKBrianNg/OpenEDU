import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Spin, Button, Collapse, List, Tag, Space, Card, Tooltip } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, FileTextOutlined, QuestionCircleOutlined, CheckCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { getCourseData } from '../api/coursesData';
import type { CourseData, Lesson } from '../mock/coursesData';

const { Title, Text, Paragraph } = Typography;

const lessonIconMap: Record<string, React.ReactNode> = {
  video: <PlayCircleOutlined style={{ color: '#1890ff' }} />,
  article: <FileTextOutlined style={{ color: '#52c41a' }} />,
  quiz: <QuestionCircleOutlined style={{ color: '#faad14' }} />,
};

const formatDuration = (minutes: number) => {
  return (minutes / 60).toFixed(2);
};

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);

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
    setCurrentLesson(lesson);
  };

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
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => window.history.back()}
          style={{ padding: 0, marginRight: 16 }}
        >
          返回
        </Button>

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
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {showSidebar && (
          <div style={{ width: 380, flexShrink: 0, transition: 'width 0.3s' }}>
            <Card 
              title="课程目录"
              styles={{ body: { maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' } }}
            >
              <Collapse
                ghost
                activeKey={expandedChapters}
                onChange={(keys) => setExpandedChapters(keys as string[])}
                items={course.chapters.map(chapter => ({
                  key: chapter.id,
                  label: (
                    <Space>
                      <Text strong>{chapter.title}</Text>
                      <Text type="secondary">({chapter.lessons.length} 节)</Text>
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
                            padding: '8px 0',
                          }}
                          extra={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {formatDuration(lesson.duration)} 小时
                            </Text>
                          }
                        >
                          <Space>
                            {lessonIconMap[lesson.type]}
                            <Text
                              style={{
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
          </div>
        )}

        <div style={{ flex: 1 }}>
          {currentLesson && currentLesson.type === 'video' && (
            <div style={{
              background: '#000', height: 420, display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#fff', borderRadius: 8,
            }}>
              <PlayCircleOutlined style={{ fontSize: 72, cursor: 'pointer' }} />
            </div>
          )}
          {currentLesson && currentLesson.type === 'article' && (
            <Card>
              <Paragraph style={{ fontSize: 16, lineHeight: 2 }}>{currentLesson.content}</Paragraph>
            </Card>
          )}
          {currentLesson && currentLesson.type === 'quiz' && (
            <Card>
              <div style={{ padding: 24, textAlign: 'center' }}>
                <QuestionCircleOutlined style={{ fontSize: 36, color: '#faad14' }} />
                <Title level={4} style={{ marginTop: 12 }}>{currentLesson.content}</Title>
                <Button type="primary" size="large">开始答题</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;