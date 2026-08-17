// client/src/pages/CourseDetail/components/LessonRenderer.tsx

import React from 'react';
import { Typography, Card, Button } from 'antd';
import { PlayCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { lessonStyles } from './LessonRenderer.style';

// 全局公共课时组件
import AudioLesson from './AudioLesson';
import ArticleLesson from './ArticleLesson';

// 导入类型和工具
import type { Lesson } from '../../../CoursesData';
import { getLocalizedValue } from '../utils';

const { Title, Text } = Typography;

interface LessonRendererProps {
  currentLesson: Lesson | null;
  isMobile: boolean;
  blurContent: boolean;
  autoSpeak: boolean;
  t: (key: string) => string;
  locale: string;
}

const LessonRenderer: React.FC<LessonRendererProps> = ({
  currentLesson,
  isMobile,
  blurContent,
  autoSpeak,
  t,
  locale,
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
      // audio 类型的 content 是歌词文件路径，不需要本地化
      return (
        <AudioLesson
          audioUrl={lessonUrl || ''}
          lyricSource={typeof content === 'string' ? content : ''}
        />
      );
    case 'article': {
      // 将原始 content 对象（LocalText）直接传递给 ArticleLesson
      // title 需要本地化为字符串
      const localizedTitle = title ? getLocalizedValue(title, locale) : "";
      return (
        <ArticleLesson
          content={content as any} // 类型断言，因为 Lesson.content 已改为 LocalText
          lessonUrl={lessonUrl}
          title={localizedTitle}
          isMobile={isMobile}
          blurContent={blurContent}
          autoSpeak={autoSpeak}
          t={t}
          locale={locale}
        />
      );
    }
    case 'quiz': {
      // quiz 类型的 content 是题目文本，需要本地化显示
      const localizedContent = content ? getLocalizedValue(content, locale) : "";
      return (
        <Card>
          <div style={quizWrapStyle}>
            <QuestionCircleOutlined style={{ fontSize: isMobile ? 36 : 50, color: '#faad14' }} />
            <Title level={isMobile ? 5 : 4} style={{ marginTop: 12 }}>{localizedContent}</Title>
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
    }
    default:
      return <Text type="secondary">{t('detail.unknownLesson')}</Text>;
  }
};

export default LessonRenderer;