// client/src/books/KnowledgeBase/components/ItemGallery.tsx
// 第二屏：某一章的条目画廊。进入时才按需拉取该章正文（useChapterItems）。

import { useEffect, useState } from 'react';
import { Spin, Typography, Empty } from 'antd';
import type { KnowledgeChapter, KnowledgeItem } from '../types';
import { COURSE_ID, chapterTheme } from '../constants';
import { itemIcon } from '../itemIcons';
import { useChapterItems } from '../hooks/useChapterItems';
import { getCourseAssetUrl } from '../../../utils/coursePath';
import { useLocale } from '../../../store/LocaleContext';
import ItemDetailModal from './ItemDetailModal';
import { BackToLobby } from './ChapterHome';

const { Title, Paragraph } = Typography;

interface ItemGalleryProps {
  chapter: KnowledgeChapter;
  chapterIndex: number;
  onBack: () => void;
  onExit?: () => void;
}

/** 图片与内容 json 同放 content/ 目录；文件名是中文，需要编码 */
function resolveImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return getCourseAssetUrl(COURSE_ID, `content/${encodeURIComponent(imageUrl)}`);
}

export default function ItemGallery({
  chapter,
  chapterIndex,
  onBack,
  onExit,
}: ItemGalleryProps) {
  const { t } = useLocale();
  const theme = chapterTheme(chapter.contentLink, chapterIndex);
  const { items, loading, error } = useChapterItems(chapter);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // 离开画廊时收起详情（例如直接点返回大厅）
  useEffect(() => {
    return () => setOpenIndex(null);
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* 「全部主题」按钮单独一行（与右上角「返回大厅」不同层级，
          全部主题回章节列表，返回大厅回首页）。 */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            borderRadius: 99,
            border: '1px solid #e0e0e0',
            background: '#fff',
            color: theme.color,
            cursor: 'pointer',
            padding: '6px 16px',
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          ← {t('knowledgebase.backToChapters') || '全部主题'}
        </button>
      </div>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 24,
          padding: '16px 20px',
          borderRadius: 18,
          background: `linear-gradient(120deg, ${theme.soft} 0%, #ffffff 80%)`,
        }}
      >
        <span style={{ fontSize: 38, lineHeight: 1 }}>{theme.icon}</span>
        <div>
          <Title level={3} style={{ margin: 0, color: theme.color }}>
            {chapter.name}
          </Title>
          <Paragraph italic style={{ color: '#999', fontSize: 14, margin: 0 }}>
            {chapter.en}
          </Paragraph>
        </div>
        {items && (
          <span
            style={{
              marginLeft: 'auto',
              padding: '4px 14px',
              borderRadius: 99,
              background: '#fff',
              color: theme.color,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: `0 1px 4px ${theme.color}22`,
            }}
          >
            {items.length}
          </span>
        )}
        <BackToLobby
          onExit={onExit}
          t={t}
          // 标题卡已经有图标/标题/徽章，绝对定位把按钮贴右上
          style={{ position: 'absolute', right: 16, top: 16, padding: '5px 14px', fontSize: 13, zIndex: 1 }}
        />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      )}

      {error && (
        <div style={{ padding: 32, color: '#d93025', textAlign: 'center' }}>
          {t('knowledgebase.loadFailed') || '加载失败'}：{error}
        </div>
      )}

      {!loading && !error && items?.length === 0 && (
        <Empty description={t('knowledgebase.noContent') || '暂无内容'} />
      )}

      {!loading && !error && items && items.length > 0 && (
        <div
          style={{
            display: 'grid',
            // 220 而不是 230：容器宽 952 时 230 只能排 3 列，220 才排得下 4 列
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 18,
          }}
        >
          {items.map((item, i) => (
            <ItemCard
              key={`${item.title.zh}-${i}`}
              item={item}
              theme={theme}
              onOpen={() => setOpenIndex(i)}
            />
          ))}
        </div>
      )}

      <ItemDetailModal
        open={openIndex !== null}
        items={items ?? []}
        index={openIndex ?? 0}
        theme={theme}
        chapterName={chapter.name}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </div>
  );
}

interface ItemCardProps {
  item: KnowledgeItem;
  theme: ReturnType<typeof chapterTheme>;
  onOpen: () => void;
}

function ItemCard({ item, theme, onOpen }: ItemCardProps) {
  const [hovered, setHovered] = useState(false);
  const src = resolveImageUrl(item.imageUrl);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background: '#fff',
        cursor: 'pointer',
        boxShadow: hovered
          ? `0 12px 26px ${theme.color}33`
          : '0 4px 14px rgba(0, 0, 0, 0.07)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        display: 'flex',
        flexDirection: 'column',
        outline: 'none',
      }}
    >
      <div
        style={{
          height: 150,
          background: theme.soft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* 有图显示图；没图显示条目自己的 emoji（而不是全章同一个，12 张卡片才区分得开） */}
        {src ? (
          <img
            src={src}
            alt={item.title.zh}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: 44 }}>{itemIcon(item.title.zh, theme.icon)}</span>
        )}
      </div>

      <div style={{ padding: '14px 16px 16px', flex: 1 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#222',
            lineHeight: 1.45,
            marginBottom: 4,
          }}
        >
          {item.title.zh}
        </div>
        <div style={{ fontSize: 12, color: '#a0a0a0', lineHeight: 1.4 }}>
          {item.title.en}
        </div>
      </div>
    </div>
  );
}
