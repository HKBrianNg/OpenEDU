// client/src/books/KnowledgeBase/components/ChapterHome.tsx
// 第一屏：8 个章节卡片。只用到 data.json，不含任何章节正文请求。

import { useState } from 'react';
import { Typography } from 'antd';
import type { KnowledgeChapter, KnowledgeIndex } from '../types';
import { chapterTheme, type ChapterTheme } from '../constants';
import { getCachedCount } from '../hooks/useChapterItems';
import { useLocale } from '../../../store/LocaleContext';

const { Title, Paragraph } = Typography;

interface ChapterHomeProps {
  index: KnowledgeIndex;
  onSelect: (chapter: KnowledgeChapter, chapterIndex: number) => void;
  onExit?: () => void;
}

export default function ChapterHome({ index, onSelect, onExit }: ChapterHomeProps) {
  const { t } = useLocale();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <BackToLobby onExit={onExit} t={t} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          {index.title}
        </Title>
        <Paragraph italic style={{ color: '#888', fontSize: 16, margin: 0 }}>
          {index.titleEn}
        </Paragraph>
        <Paragraph style={{ color: '#aaa', fontSize: 13, marginTop: 8, marginBottom: 0 }}>
          {`${index.chapters.length} ${t('knowledgebase.chapterUnit') || '个主题'}`}
        </Paragraph>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
          gap: 18,
        }}
      >
        {index.chapters.map((chapter, i) => {
          const theme = chapterTheme(chapter.contentLink, i);
          // 只在已加载过该章时才有数量 —— 坚持按需加载，不为角标去预取所有章节
          const count = getCachedCount(chapter.contentLink);
          const isHover = hovered === chapter.contentLink;

          return (
            <ChapterCard
              key={chapter.contentLink}
              chapter={chapter}
              theme={theme}
              count={count}
              hovered={isHover}
              onHover={(v) => setHovered(v ? chapter.contentLink : null)}
              onSelect={() => onSelect(chapter, i)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ChapterCardProps {
  chapter: KnowledgeChapter;
  theme: ChapterTheme;
  count: number | null;
  hovered: boolean;
  onHover: (v: boolean) => void;
  onSelect: () => void;
}

function ChapterCard({
  chapter,
  theme,
  count,
  hovered,
  onHover,
  onSelect,
}: ChapterCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        position: 'relative',
        borderRadius: 20,
        padding: '22px 18px 20px',
        cursor: 'pointer',
        background: `linear-gradient(160deg, ${theme.soft} 0%, #ffffff 72%)`,
        boxShadow: hovered
          ? `0 12px 26px ${theme.color}33`
          : '0 4px 14px rgba(0, 0, 0, 0.06)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        outline: 'none',
      }}
    >
      <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 12 }}>{theme.icon}</div>

      <div style={{ fontSize: 19, fontWeight: 700, color: theme.color, marginBottom: 2 }}>
        {chapter.name}
      </div>
      <div style={{ fontSize: 12, color: '#9aa0a6' }}>{chapter.en}</div>

      {count !== null && (
        <span
          style={{
            display: 'inline-block',
            marginTop: 14,
            padding: '2px 10px',
            borderRadius: 99,
            background: '#fff',
            color: theme.color,
            fontSize: 12,
            fontWeight: 600,
            boxShadow: `0 1px 4px ${theme.color}22`,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

/**
 * 返回大厅按钮（首页与画廊页共用同一样式）。
 * 只吐按钮、不带外层容器 —— 画廊页要把它和「全部主题」放在同一行，
 * 由调用方决定间距。
 */
export function BackToLobby({
  onExit,
  t,
}: {
  onExit?: () => void;
  t: (key: string) => string;
}) {
  if (!onExit) return null;
  return (
    <button
      onClick={onExit}
      style={{
        borderRadius: 99,
        border: '1px solid #d0d0d0',
        background: '#fff',
        color: '#333',
        cursor: 'pointer',
        padding: '6px 16px',
        fontSize: 14,
        whiteSpace: 'nowrap',
      }}
    >
      ← {t('knowledgebase.backToLobby') || '返回大厅'}
    </button>
  );
}
