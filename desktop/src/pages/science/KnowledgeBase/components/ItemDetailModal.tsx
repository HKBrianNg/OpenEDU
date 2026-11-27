// client/src/books/KnowledgeBase/components/ItemDetailModal.tsx
// 第三屏：单条详情。大图 + 中英正文，点朗读按钮逐句高亮跟读。

import { useEffect } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Modal, Typography } from 'antd';
import type { KnowledgeItem } from '../types';
import type { ChapterTheme } from '../constants';
import { COURSE_ID } from '../constants';
import { itemIcon } from '../itemIcons';
import { useSentenceSpeech, type SpeechLang } from '../hooks/useSentenceSpeech';
import { useLocale } from '../../../../store/LocaleContext';
import { getCourseAssetUrl } from '../../../../utils/coursePath';
import { knowledgeAudioPath } from '../../../../utils/voiceAssets';

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
  /** 内容文件主名（如 human-body），用于拼预生成音频路径 */
  stem: string;
  /** 中文读音：普通话 / 粤语（页面级切换，影响点中文题目、中文正文） */
  zhReadMode?: 'zh' | 'yue';
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export default function ItemDetailModal({
  open,
  items,
  index,
  theme,
  chapterName,
  stem,
  zhReadMode = 'zh',
  onIndexChange,
  onClose,
}: ItemDetailModalProps) {
  const { t } = useLocale();
  const { supported, sentences, activeIndex, speakingLang, speakingText, toggle, stop } =
    useSentenceSpeech();

  const item = items[index];
  /** 点中文按页面读音设置：普通话（_zh.mp3）/ 粤语（_yue.mp3，未生成回退 TTS） */
  const readYue = zhReadMode === 'yue';
  const zhAudioUrl = (part: 'title' | 'content', text: string) =>
    audioUrl(part, readYue ? 'yue' : 'zh', text);
  const zhSpeechLang: SpeechLang = readYue ? 'zh-HK' : 'zh-CN';

  // 切换条目或关闭时必须停掉朗读：否则会读到上一题的内容 / 关窗后还在响
  useEffect(() => {
    stop();
  }, [index, stop]);

  useEffect(() => {
    if (!open) stop();
  }, [open, stop]);

  if (!item) return null;

  const isFirst = index <= 0;
  const isLast = index >= items.length - 1;

  /** 预生成音频（VoiceAdmin 产物）的 URL；没文本就没有对应文件，返回 undefined 走 TTS；yue = 粤语 */
  const audioUrl = (
    part: 'title' | 'content',
    lang: 'zh' | 'en' | 'yue',
    text: string,
  ): string | undefined => {
    if (!text || !stem) return undefined;
    return getCourseAssetUrl(
      COURSE_ID,
      knowledgeAudioPath({ stem, index, titleZh: item.title.zh, titleEn: item.title.en, part, lang }),
    );
  };

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
  const speechProps = (text: string, lang: SpeechLang, audio?: string): SpeechProps => ({
    role: 'button',
    tabIndex: 0,
    onClick: () => toggle(text, lang, audio),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle(text, lang, audio);
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
          {/* 问题本身也能点：点中文题目按读音设置读，点英文题目读英文 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Title
              level={4}
              style={{ margin: 0, flex: 1, color: '#222', cursor: supported ? 'pointer' : 'default' }}
              {...speechProps(item.title.zh, zhSpeechLang, zhAudioUrl('title', item.title.zh))}
            >
              {item.title.zh}
            </Title>
          </div>
          <Paragraph
            italic
            style={{
              color: '#888',
              fontSize: 13,
              margin: '2px 0 0',
              cursor: supported ? 'pointer' : 'default',
            }}
            {...speechProps(item.title.en, 'en-US', audioUrl('title', 'en', item.title.en))}
          >
            {item.title.en}
          </Paragraph>
        </div>

        {/* emoji 在左、正文在右：竖排会把弹窗顶出屏幕、逼出滚动条，横排省掉一半高度 */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            padding: '14px 24px 16px',
          }}
        >
          <div
            style={{
              flex: '0 0 200px',
              width: 200,
              height: 200,
              borderRadius: 14,
              background: theme.soft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 96,
              lineHeight: 1,
            }}
          >
            {itemIcon(item.title.zh, theme.icon)}
          </div>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <ContentBlock
            label="中文"
            color="#333"
            fontSize={15}
            accent={theme.color}
            speaking={speakingLang === zhSpeechLang}
            hint={
              speakingLang === zhSpeechLang
                ? t('knowledgebase.reading')
                : t('knowledgebase.tapToRead')
            }
            speech={speechProps(item.content.zh, zhSpeechLang, zhAudioUrl('content', item.content.zh))}
          >
            {renderBody(item.content.zh, zhSpeechLang)}
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
            speech={speechProps(item.content.en, 'en-US', audioUrl('content', 'en', item.content.en))}
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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: speaking ? accent : '#ccc' }}>
            {speaking ? `🔊 ${hint}` : `🔈 ${hint}`}
          </span>
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
