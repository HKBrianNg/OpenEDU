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

  const xiaoxiaoNatural = zhVoices.find(
    v => /xiaoxiao/i.test(v.name) && /(natural|neural|online)/i.test(v.name)
  );
  if (xiaoxiaoNatural) return xiaoxiaoNatural;

  const anyNatural = zhVoices.find(
    v => /(natural|neural|online)/i.test(v.name)
  );
  if (anyNatural) return anyNatural;

  const sysDefault = zhVoices.find(v => v.default);
  if (sysDefault) return sysDefault;

  return zhVoices[0];
}

// -----------------------------------

// 字符串标准化：去除首尾空格、转小写、去除常见标点、合并多余空格
const normalizeStr = (str: string) => {
  return str
    .trim()
    .toLowerCase()
    .replace(/[.,。，！？!?'"、：；\s]+/g, '');
};

// 判断字符串是否包含中文
const hasChinese = (str: string) => /[\u4e00-\u9fff]/.test(str);

// 中文按字排序（用于乱序容错）
const sortChineseChars = (str: string) => {
  return str
    .replace(/[^一-龥]/g, '')
    .split('')
    .sort()
    .join('');
};

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

  // 根据目标语言选择占位符 key
  const targetLang = locale === 'zh' ? 'en' : 'zh';
  const inputPlaceholder = targetLang === 'en'
    ? t('detail.input.placeholderEn')
    : t('detail.input.placeholderZh');

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

  useEffect(() => {
    if (autoSpeak && currentContent) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsSpeaking(true);
      speakText(currentContent, speechLang);
    }
  }, [autoSpeak, currentContent, speechLang, speakText]);

  // 增强型答案校验
  const checkAnswer = useCallback(() => {
    if (!userInput.trim() || !otherContent) return;

    const userClean = normalizeStr(userInput);
    const answerClean = normalizeStr(otherContent);

    let isCorrect = false;

    // 1. 完全匹配（忽略标点空格大小写）
    if (userClean === answerClean) {
      isCorrect = true;
    } else {
      // 2. 如果答案是中文，尝试乱序容错
      if (hasChinese(answerClean)) {
        const userSorted = sortChineseChars(userClean);
        const answerSorted = sortChineseChars(answerClean);
        if (userSorted === answerSorted) {
          isCorrect = true;
        }
      }
    }

    setFeedback(isCorrect ? 'correct' : 'incorrect');
  }, [userInput, otherContent]);

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
    width: isMobile ? '100%' : 345,
    maxWidth: isMobile ? 415 : 525,
    height: isMobile ? 162 : 268,
    borderRadius: 8,
    objectFit: 'cover',
    flexShrink: 0,
  };

  const blurFilterStyle: CSSProperties = {
    filter: blurContent ? 'blur(8px)' : 'none',
    transition: 'filter 0.55s',
    userSelect: blurContent ? 'none' : 'auto',
  };

  return (
    <Card styles={{ body: cardBodyStyle }}>
      <div style={{
        display: 'flex',
        gap: isMobile ? 12 : 37,
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
              ...blurFilterStyle,
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
                marginTop: 5,
                marginBottom: 0,
                borderLeft: '2px solid #d9d9d9',
                paddingLeft: 10,
                ...blurFilterStyle,
              }}
            >
              {otherContent}
            </Paragraph>
          )}
        </div>
      </div>

      <div style={{
        marginTop: isMobile ? 16 : 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 10 : 0,
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
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Input.TextArea
            rows={2}
            placeholder={inputPlaceholder}
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            style={{ flex: 1, fontSize: isMobile ? 14 : 15 }}
            status={feedback === 'incorrect' ? 'error' : feedback === 'correct' ? 'success' : undefined}
          />
          <div style={{ paddingTop: 5 }}>
            {feedback === 'correct' && <CheckOutlined style={{ color: '#52c41a', fontSize: 24 }} />}
            {feedback === 'incorrect' && <CloseOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />}
          </div>
        </div>
        {feedback === 'correct' && (
          <Alert
            message={t('detail.correct')}
            type="success"
            showIcon
            closable
            style={{ marginTop: 12, fontSize: isMobile ? 14 : 16 }}
          />
        )}
        {feedback === 'incorrect' && (
          <Alert
            type="warning"
            showIcon
            closable
            style={{ marginTop: 12 }}
            message={
              <span style={{ fontSize: isMobile ? 14 : 16 }}>
                {t('detail.incorrect')}<br />
                <strong>{t('detail.original')}</strong>{otherContent}
              </span>
            }
          />
        )}
      </div>
    </Card>
  );
};

export default ArticleLesson;