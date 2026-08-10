import React from 'react';
import { Card, Button, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { lessonStyles } from './LessonRenderer.style';


const { Title } = Typography;

export interface QuizLessonProps {
  lessonUrl?: string;
  content?: string;
  isMobile: boolean;
  t: (key: string) => string;
}

const QuizLesson: React.FC<QuizLessonProps> = ({ lessonUrl, content, isMobile, t }) => {
  const quizWrapStyle = isMobile ? lessonStyles.quizWrapMobile : lessonStyles.quizWrapPc;

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
};

export default QuizLesson;
