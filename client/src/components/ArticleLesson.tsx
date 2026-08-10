import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Alert, Typography } from 'antd';
import { SoundOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { CSSProperties } from 'react';

const { Paragraph } = Typography;

export interface ArticleLessonProps {
  content: string;
  lessonUrl?: string;
  title: string;
  isMobile: boolean;
  blurContent: boolean;
  t: (key: string) => string;
}

const ArticleLesson: React.FC<ArticleLessonProps> = ({
  content,
  lessonUrl,
  title,
  isMobile,
  blurContent,
  t
}) => {
  // 全部状态内聚到子组件，父页面不再维护
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  // 朗读逻辑迁移至此
  const handleSpeak = useCallback(() => {
    if (!content) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [content, isSpeaking]);

  // 答题校验逻辑迁移至此
  const checkAnswer = useCallback(() => {
    if (!content || !userInput.trim()) return;
    const userTrimmed = userInput.trim().toLowerCase();
    const originalTrimmed = content.trim().toLowerCase();
    setFeedback(userTrimmed === originalTrimmed ? 'correct' : 'incorrect');
  }, [content, userInput]);

  // 输入框变更
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
    if (feedback) setFeedback(null);
  };

  // 回车提交答题
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      checkAnswer();
    }
  };

  // 组件销毁停止朗读
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, []);

  const cardBodyStyle: CSSProperties = { padding: isMobile ? 12 : 18 };
  const imgStyle: CSSProperties = {
    width: isMobile ? '100%' : 440,
    maxWidth: isMobile ? 540 : 620,
    height: isMobile ? 220 : 340,
    borderRadius: 8,
    objectFit: 'cover',
    flexShrink: 0
  };

  return (
    <Card styles={{ body: cardBodyStyle }}>
      <div style={{
        display: 'flex',
        gap: isMobile ? 12 : 33,
        alignItems: 'flex-start',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        {lessonUrl && (
          <img src={lessonUrl} alt={title} style={imgStyle} />
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
            {content}
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
            rows={2}
            placeholder={t('detail.input.placeholder')}
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            style={{ flex: 1, fontSize: isMobile ? 14 : 15 }}
            status={feedback === 'incorrect' ? 'error' : feedback === 'correct' ? 'success' : undefined}
          />
          <div style={{ paddingTop: 6, paddingBottom: 4 }}>
            {feedback === 'correct' && <CheckOutlined style={{ color: '#52c41a', fontSize: 18 }} />}
            {feedback === 'incorrect' && <CloseOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />}
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
                <strong>{t('detail.original')}</strong>{content}
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
  );
};

export default ArticleLesson;
