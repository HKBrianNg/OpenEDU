import React from 'react';
import { Typography, Card, Button } from 'antd';
import { PlayCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { lessonStyles } from './LessonRenderer.style';

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
  const videoBoxStyle = isMobile ? lessonStyles.videoBoxMobile : lessonStyles.videoBoxPc;
  const videoTextStyle = isMobile ? lessonStyles.videoTextMobile : lessonStyles.videoTextPc;
  const quizWrapStyle = isMobile ? lessonStyles.quizWrapMobile : lessonStyles.quizWrapPc;

  switch (type) {
    case 'video':
      return (
        <div style={videoBoxStyle}>
          <a
            href={lessonUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={lessonStyles.videoLink}
          >
            <PlayCircleOutlined style={{ fontSize: isMobile ? 44 : 72, cursor: 'pointer' }} />
            <div style={videoTextStyle}>{t('detail.video.play')}</div>
          </a>
        </div>
      );

    case 'audio':
      return (
        <AudioLesson
          audioUrl={lessonUrl || ''}
          lyricSource={content || ''}
          title={title ?? ""}
        />
      );

    case 'article':
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
          <div style={quizWrapStyle}>
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
