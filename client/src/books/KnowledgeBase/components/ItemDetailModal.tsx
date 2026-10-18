// client/src/books/KnowledgeBase/components/ItemDetailModal.tsx
// 第三屏：单条详情。大图 + 中英正文，点朗读按钮逐句高亮跟读。

import { useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Modal, Typography } from 'antd';
import type { KnowledgeItem } from '../types';
import type { ChapterTheme } from '../constants';
import { COURSE_ID } from '../constants';
import { getCourseAssetUrl } from '../../../utils/coursePath';
import { useSentenceSpeech, type SpeechLang } from '../hooks/useSentenceSpeech';
import { useLocale } from '../../../store/LocaleContext';

const { Title, Paragraph } = Typography;

interface ItemDetailModalProps {
  open: boolean;
  items: KnowledgeItem[];
  index: number;
  theme: ChapterTheme;
  chapterName: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

function resolveImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return getCourseAssetUrl(COURSE_ID, `content/${encodeURIComponent(imageUrl)}`);
}

export default function ItemDetailModal({
  open,
  items,
  index,
  theme,
  chapterName,
  onIndexChange,
  onClose,
}: ItemDetailModalProps) {
  const { t } = useLocale();
  const { supported, sentences, activeIndex, speakingLang, toggle, stop } =
    useSentenceSpeech();

  const item = items[index];

  // 切换条目或关闭时必须停掉朗读：否则会读到上一题的内容 / 关窗后还在响
  useEffect(() => {
    stop();
  }, [index, stop]);

  useEffect(() => {
    if (!open) stop();
  }, [open, stop]);

  if (!item) return null;

  const src = resolveImageUrl(item.imageUrl);
  const isFirst = index <= 0;
  const isLast = index >= items.length - 1;

  /** 正在朗读该语言时按句渲染并高亮当前句，否则整段直出 */
  const renderBody = (text: string, lang: SpeechLang) => {
    if (speakingLang === lang && sentences.length > 0) {
      return (
        <span>
          {sentences.map((s, i) => (
            <span
              key={i}
              style={{
                background: i === activeIndex ? '#ffe58f' : 'transparent',
                borderRadius: 4,
                transition: 'background-color 0.2s ease',
              }}
            >
              {s}
            </span>
          ))}
        </span>
      );
    }
    return <>{text}</>;
  };

  const langButton = (lang: SpeechLang, label: string) => {
    const active = speakingLang === lang;
    return (
      <button
        onClick={() => toggle(lang === 'zh-CN' ? item.content.zh : item.content.en, lang)}
        disabled={!supported}
        title={supported ? undefined : t('knowledgebase.speechNotSupported')}
        style={{
          borderRadius: 99,
          border: `1px solid ${active ? theme.color : '#d9d9d9'}`,
          background: active ? theme.color : '#fff',
          color: active ? '#fff' : '#555',
          padding: '5px 14px',
          fontSize: 13,
          cursor: supported ? 'pointer' : 'not-allowed',
          opacity: supported ? 1 : 0.5,
          fontWeight: 600,
        }}
      >
        {active ? `⏹ ${t('knowledgebase.stop') || '停止'}` : `🔊 ${label}`}
      </button>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(760px, 92vw)"
      centered
      styles={{ body: { padding: 0, borderRadius: 20, overflow: 'hidden' } }}
    >
      <div>
        {/* 顶部：章节色条 + 标题 */}
        <div style={{ background: theme.soft, padding: '18px 24px 16px' }}>
          <div style={{ fontSize: 12, color: theme.color, fontWeight: 600, marginBottom: 4 }}>
            {chapterName}
          </div>
          <Title level={4} style={{ margin: 0, color: '#222' }}>
            {item.title.zh}
          </Title>
          <Paragraph italic style={{ color: '#888', fontSize: 13, margin: '2px 0 0' }}>
            {item.title.en}
          </Paragraph>
        </div>

        {src && (
          <div style={{ background: '#fafafa', textAlign: 'center', maxHeight: 320 }}>
            <img
              src={src}
              alt={item.title.zh}
              style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain' }}
            />
          </div>
        )}

        <div style={{ padding: '18px 24px 20px' }}>
          <ContentBlock
            label="中文"
            color="#333"
            fontSize={15}
            button={langButton('zh-CN', t('knowledgebase.readZh') || '朗读中文')}
          >
            {renderBody(item.content.zh, 'zh-CN')}
          </ContentBlock>

          <ContentBlock
            label="English"
            color="#666"
            fontSize={14}
            button={langButton('en-US', t('knowledgebase.readEn') || 'Read aloud')}
          >
            {renderBody(item.content.en, 'en-US')}
          </ContentBlock>
        </div>

        {/* 底部：上一题 / 下一题 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 24px 18px',
            borderTop: '1px solid #f0f0f0',
          }}
        >
          <button
            onClick={() => onIndexChange(index - 1)}
            disabled={isFirst}
            style={navButtonStyle(isFirst)}
          >
            ← {t('knowledgebase.prev') || '上一个'}
          </button>

          <span style={{ fontSize: 13, color: '#999' }}>
            {index + 1} / {items.length}
          </span>

          <button
            onClick={() => onIndexChange(index + 1)}
            disabled={isLast}
            style={navButtonStyle(isLast)}
          >
            {t('knowledgebase.next') || '下一个'} →
          </button>
        </div>
      </div>
    </Modal>
  );
}

function navButtonStyle(disabled: boolean): CSSProperties {
  return {
    borderRadius: 99,
    border: '1px solid #e0e0e0',
    background: '#fff',
    color: disabled ? '#ccc' : '#444',
    padding: '6px 16px',
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function ContentBlock({
  label,
  color,
  fontSize,
  button,
  children,
}: {
  label: string;
  color: string;
  fontSize: number;
  button: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 10,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#aaa', letterSpacing: 1 }}>
          {label}
        </span>
        {button}
      </div>
      <div style={{ fontSize, lineHeight: 1.9, color }}>{children}</div>
    </div>
  );
}
