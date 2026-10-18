// client/src/books/KnowledgeBase/components/ItemDetailModal.tsx
// 第三屏：单条详情。大图 + 中英正文，点朗读按钮逐句高亮跟读。

import { useEffect } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Modal, Typography } from 'antd';
import type { KnowledgeItem } from '../types';
import type { ChapterTheme } from '../constants';
import { COURSE_ID } from '../constants';
import { getCourseAssetUrl } from '../../../utils/coursePath';
import { useSentenceSpeech, type SpeechLang } from '../hooks/useSentenceSpeech';
import { useLocale } from '../../../store/LocaleContext';

const { Title, Paragraph } = Typography;

/** 挂在任意一段文字上，就让它「点一下朗读」 */
interface SpeechProps {
  role: 'button';
  tabIndex: 0;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  title: string;
}

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
  const { supported, sentences, activeIndex, speakingLang, speakingText, toggle, stop } =
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

  /** 正在朗读「这段」文字时按句渲染并高亮当前句，否则整段直出 */
  const renderBody = (text: string, lang: SpeechLang) => {
    if (speakingLang === lang && speakingText === text && sentences.length > 0) {
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
              {/* 切句时句末的空格被 trim 掉了，英文要补回来，否则读起来连成一片 */}
              {lang === 'en-US' && i < sentences.length - 1 ? ' ' : ''}
            </span>
          ))}
        </span>
      );
    }
    return <>{text}</>;
  };

  /** 让一段文字变成「点一下就朗读」：鼠标 + 键盘都能触发 */
  const speechProps = (text: string, lang: SpeechLang): SpeechProps => ({
    role: 'button',
    tabIndex: 0,
    onClick: () => toggle(text, lang),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle(text, lang);
      }
    },
    title: supported ? t('knowledgebase.tapToRead') : t('knowledgebase.speechNotSupported'),
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(880px, 94vw)"
      centered
      styles={{ body: { padding: 0, borderRadius: 20, overflow: 'hidden' } }}
    >
      <div>
        {/* 顶部：章节色条 + 标题 */}
        <div style={{ background: theme.soft, padding: '14px 24px 12px' }}>
          <div style={{ fontSize: 12, color: theme.color, fontWeight: 600, marginBottom: 4 }}>
            {chapterName}
          </div>
          {/* 问题本身也能点：点中文题目读中文，点英文题目读英文 */}
          <Title
            level={4}
            style={{ margin: 0, color: '#222', cursor: supported ? 'pointer' : 'default' }}
            {...speechProps(item.title.zh, 'zh-CN')}
          >
            {item.title.zh}
          </Title>
          <Paragraph
            italic
            style={{
              color: '#888',
              fontSize: 13,
              margin: '2px 0 0',
              cursor: supported ? 'pointer' : 'default',
            }}
            {...speechProps(item.title.en, 'en-US')}
          >
            {item.title.en}
          </Paragraph>
        </div>

        {/* 图在左、正文在右：竖排会把弹窗顶出屏幕、逼出滚动条，横排省掉一半高度 */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            padding: '14px 24px 16px',
          }}
        >
          {src && (
            <img
              src={src}
              alt={item.title.zh}
              style={{
                flex: '0 0 200px',
                width: 200,
                height: 200,
                objectFit: 'cover',
                borderRadius: 14,
                background: '#fafafa',
              }}
            />
          )}
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <ContentBlock
            label="中文"
            color="#333"
            fontSize={15}
            accent={theme.color}
            speaking={speakingLang === 'zh-CN'}
            hint={
              speakingLang === 'zh-CN'
                ? t('knowledgebase.reading')
                : t('knowledgebase.tapToRead')
            }
            speech={speechProps(item.content.zh, 'zh-CN')}
          >
            {renderBody(item.content.zh, 'zh-CN')}
          </ContentBlock>

          <ContentBlock
            label="English"
            color="#666"
            fontSize={14}
            accent={theme.color}
            speaking={speakingLang === 'en-US'}
            hint={
              speakingLang === 'en-US'
                ? t('knowledgebase.reading')
                : t('knowledgebase.tapToRead')
            }
            speech={speechProps(item.content.en, 'en-US')}
          >
            {renderBody(item.content.en, 'en-US')}
          </ContentBlock>
          </div>
        </div>

        {/* 底部：上一题 / 下一题 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 24px 14px',
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
  accent,
  speaking,
  hint,
  speech,
  children,
}: {
  label: string;
  color: string;
  fontSize: number;
  accent: string;
  speaking: boolean;
  hint: string;
  speech: SpeechProps;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
          gap: 10,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#aaa', letterSpacing: 1 }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: speaking ? accent : '#ccc' }}>
          {speaking ? `🔊 ${hint}` : `🔈 ${hint}`}
        </span>
      </div>
      {/* 整块正文可点：点中文读中文，点英文读英文；再点一次停止 */}
      <div
        {...speech}
        style={{
          fontSize,
          lineHeight: 1.75,
          color,
          cursor: 'pointer',
          borderRadius: 8,
          padding: '6px 8px',
          margin: '-6px -8px',
          background: speaking ? '#fffbe6' : 'transparent',
          transition: 'background-color 0.2s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
