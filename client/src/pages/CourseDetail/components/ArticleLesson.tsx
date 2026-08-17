import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Alert, Typography } from 'antd';
import { SoundOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { CSSProperties } from 'react';

const { Paragraph } = Typography;

// 定义 LocalText 类型（如果全局已有，请从 utils 或 CoursesData 导入）
interface LocalText {
  zh: string;
  en: string;
}

export interface ArticleLessonProps {
  content: LocalText; // 接收双语对象
  lessonUrl?: string;
  title: string;
  isMobile: boolean;
  blurContent: boolean;
  autoSpeak: boolean;
  t: (key: string) => string;
  locale: string; // 接收当前语言
}

const ArticleLesson: React.FC<ArticleLessonProps> = ({
  content,
  lessonUrl,
  title,
  isMobile,
  blurContent,
  autoSpeak,
  t,
  locale,
}) => {
  // 全部状态内聚到子组件
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  // 根据当前 locale 拆分主文本和副文本
  const currentContent = content ? (locale === 'zh' ? content.zh : content.en) : '';
  const otherContent = content ? (locale === 'zh' ? content.en : content.zh) : '';

  // 朗读逻辑迁移至此
  const handleSpeak = useCallback(() => {
    if (!currentContent) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(currentContent);
    utterance.lang = locale === 'zh' ? 'zh-CN' : 'en-US'; // 动态设置语言
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [currentContent, isSpeaking, locale]);

  // 自动朗读
  useEffect(() => {
    if (autoSpeak && currentContent) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      const utterance = new SpeechSynthesisUtterance(currentContent);
      utterance.lang = locale === 'zh' ? 'zh-CN' : 'en-US';
      utterance.rate = 0.85;
      utterance.pitch = 1;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  }, [autoSpeak, currentContent, locale]);

  // 答题校验逻辑（基于当前主语言内容比对）
  const checkAnswer = useCallback(() => {
    if (!currentContent || !userInput.trim()) return;
    const userTrimmed = userInput.trim().toLowerCase();
    const originalTrimmed = currentContent.trim().toLowerCase();
    setFeedback(userTrimmed === originalTrimmed ? 'correct' : 'incorrect');
  }, [currentContent, userInput]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
    if (feedback) setFeedback(null);
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
    flexShrink: 0,
  };

  return (
    <Card styles={{ body: cardBodyStyle }}>
      <div style={{
        display: 'flex',
        gap: isMobile ? 12 : 33,
        alignItems: 'flex-start',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        {lessonUrl && (
          <img src={lessonUrl} alt={title} style={imgStyle} />
        )}
        <div style={{ flex: 1 }}>
          {/* 主语言内容 */}
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
            {currentContent}
          </Paragraph>
          {/* 副语言内容（对照学习） */}
          {otherContent && (
            <Paragraph
              type="secondary"
              style={{
                fontSize: isMobile ? 13 : 14,
                lineHeight: 1.8,
                marginTop: 8,
                marginBottom: 0,
                borderLeft: '2px solid #d9d9d9',
                paddingLeft: 12,
              }}
            >
              {otherContent}
            </Paragraph>
          )}
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
                <strong>{t('detail.original')}</strong>{currentContent}
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