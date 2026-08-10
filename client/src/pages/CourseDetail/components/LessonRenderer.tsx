import React from 'react';
import { Typography, Card, Button } from 'antd';
import { PlayCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';

// 全局公共课时组件
import AudioLesson from '../../../components/AudioLesson';
import ArticleLesson from '../../../components/ArticleLesson';

const { Title, Text } = Typography;

// 课时类型约束
interface LessonItem {
  type: 'video' | 'audio' | 'article' | 'quiz';
  lessonUrl?: string;
  content?: string;
  title?: string;
}

interface LessonRendererProps {
  currentLesson: LessonItem | null;
  isMobile: boolean;
  blurContent: boolean;
  t: (key: string) => string;
}

const LessonRenderer: React.FC<LessonRendererProps> = ({
  currentLesson,
  isMobile,
  blurContent,
  t
}) => {
  if (!currentLesson) return null;

  const { type, lessonUrl, content, title } = currentLesson;

  switch (type) {
    case 'video':
      return (
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
            href={lessonUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#fff', textDecoration: 'none', textAlign: 'center' }}
          >
            <PlayCircleOutlined style={{ fontSize: isMobile ? 44 : 72, cursor: 'pointer' }} />
            <div style={{ marginTop: 8, fontSize: isMobile ? 13 : 15 }}>{t('detail.video.play')}</div>
          </a>
        </div>
      );

    case 'audio':
      // 使用 ?? "" 兜底undefined，保证传入string
      return (
        <AudioLesson
          audioUrl={lessonUrl || ''}
          lyricSource={content || ''}
          title={title ?? ""}
        />
      );

    case 'article':
      // 使用 ?? "" 兜底undefined，保证传入string
      return (
        <ArticleLesson
          content={content || ""}
          lessonUrl={lessonUrl}
          title={title ?? ""}
          isMobile={isMobile}
          blurContent={blurContent}
          t={t}
        />
      );

    case 'quiz':
      return (
        <Card>
          <div style={{ padding: isMobile ? 28 : 56, textAlign: 'center' }}>
            <QuestionCircleOutlined style={{ fontSize: isMobile ? 36 : 50, color: '#faad14' }} />
            <Title level={isMobile ? 5 : 4} style={{ marginTop: 12 }}>{content}</Title>
            {lessonUrl && (
              <Button
                type="primary"
                size={isMobile ? 'middle' : 'large'}
                href={lessonUrl}
                target="_blank"
                rel="noopener noreferrer"
                block={isMobile}
              >
                {t('detail.startQuiz')}
              </Button>
            )}
          </div>
        </Card>
      );

    default:
      return <Text type="secondary">{t('detail.unknownLesson')}</Text>;
  }
};

export default LessonRenderer;
