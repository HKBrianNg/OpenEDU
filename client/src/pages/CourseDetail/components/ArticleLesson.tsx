// client/src/pages/CourseDetail/components/ArticleLesson.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Alert, Typography } from 'antd';
import { SoundOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { CSSProperties } from 'react';

const { Paragraph } = Typography;

export interface ArticleLessonProps {
  content: { zh: string; en: string };
  lessonUrl?: string;
  title: string;
  isMobile: boolean;
  blurContent: boolean;
  autoSpeak: boolean;
  t: (key: string) => string;
  locale: string;
}

// ---------- TTS 工具函数 ----------
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      cachedVoices = existing;
      resolve(existing);
      return;
    }
    const handler = () => {
      const voices = window.speechSynthesis.getVoices();
      cachedVoices = voices;
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(voices);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
  });
}

function pickBestChineseVoice(): SpeechSynthesisVoice | null {
  const voices = cachedVoices.length
    ? cachedVoices
    : window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const zhVoices = voices.filter(v => v.lang.startsWith('zh'));
  if (!zhVoices.length) return null;

  // 优先级1：Xiaoxiao Natural/Neural
  const xiaoxiaoNatural = zhVoices.find(
    v => /xiaoxiao/i.test(v.name) && /(natural|neural|online)/i.test(v.name)
  );
  if (xiaoxiaoNatural) return xiaoxiaoNatural;

  // 优先级2：任意 Natural/Neural 中文嗓
  const anyNatural = zhVoices.find(
    v => /(natural|neural|online)/i.test(v.name)
  );
  if (anyNatural) return anyNatural;

  // 优先级3：系统默认中文嗓
  const sysDefault = zhVoices.find(v => v.default);
  if (sysDefault) return sysDefault;

  // 兜底：第一个中文嗓
  return zhVoices[0];
}

// -----------------------------------

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const currentContent = locale === 'zh' ? content.zh : content.en;
  const otherContent = locale === 'zh' ? content.en : content.zh;
  const speechLang = locale === 'zh' ? 'zh-CN' : 'en-US';

  // 预热 voices
  useEffect(() => {
    loadVoices();
    return () => {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, []);

  const speakText = useCallback(async (text: string, lang: string) => {
    if (!text) return;
    await loadVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // 中文朗读时主动选择最优嗓音
    if (lang.startsWith('zh')) {
      const bestVoice = pickBestChineseVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
      }
    }

    utterance.rate = 0.82;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleSpeak = useCallback(() => {
    if (!currentContent) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    speakText(currentContent, speechLang);
  }, [currentContent, isSpeaking, speechLang, speakText]);

  // 自动朗读
  useEffect(() => {
    if (autoSpeak && currentContent) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsSpeaking(true);
      speakText(currentContent, speechLang);
    }
  }, [autoSpeak, currentContent, speechLang, speakText]);

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
      if (feedback) {
        setUserInput('');
        setFeedback(null);
        return;
      }
      checkAnswer();
    }
  };

  const cardBodyStyle: CSSProperties = { padding: isMobile ? 12 : 18 };
  const imgStyle: CSSProperties = {
    width: isMobile ? '100%' : 400,
    maxWidth: isMobile ? 480 : 600,
    height: isMobile ? 200 : 320,
    borderRadius: 8,
    objectFit: 'cover',
    flexShrink: 0,
  };

  return (
    <Card styles={{ body: cardBodyStyle }}>
      <div style={{
        display: 'flex',
        gap: isMobile ? 12 : 60,
        alignItems: 'flex-start',
        flexDirection: isMobile ? 'column' : 'row',
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
              transition: 'filter 0.55s',
              userSelect: blurContent ? 'none' : 'auto',
            }}
          >
            {currentContent}
          </Paragraph>
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
        marginTop: isMobile ? 12 : 80,
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

      <div style={{ marginTop: isMobile ? 48 : 90 }}>
        <div style={{ display: 'flex', gap: 120, alignItems: 'flex-start' }}>
          <Input.TextArea
            rows={2}
            placeholder={t('detail.input.placeholder')}
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            style={{ flex: 1, fontSize: isMobile ? 14 : 15 }}
            status={feedback === 'incorrect' ? 'error' : feedback === 'correct' ? 'success' : undefined}
          />
          <div style={{ paddingTop: 130, paddingBottom: 160 }}>
            {feedback === 'correct' && <CheckOutlined style={{ color: '#52c41a', fontSize: 54 }} />}
            {feedback === 'incorrect' && <CloseOutlined style={{ color: '#ff4d4f', fontSize: 51 }} />}
          </div>
        </div>
        {feedback === 'correct' && (
          <Alert
            message={t('detail.correct')}
            type="success"
            showIcon
            closable
            style={{ marginTop: 150, fontSize: isMobile ? 87 : 110 }}
          />
        )}
        {feedback === 'incorrect' && (
          <Alert
            message={
              <span style={{ fontSize: isMobile ? 76 : 88 }}>
                {t('detail.incorrect')}<br />
                <strong>{t('detail.original')}</strong>{currentContent}
              </span>
            }
            type="warning"
            showIcon
            closable
            style={{ marginTop: 98 }}
          />
        )}
      </div>
    </Card>
  );
};

export default ArticleLesson;