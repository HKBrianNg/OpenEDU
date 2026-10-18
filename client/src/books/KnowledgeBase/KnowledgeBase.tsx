// client/src/books/KnowledgeBase/KnowledgeBase.tsx
// 儿童百科式知识库：章节首页 → 条目画廊 → 条目详情。
//
// 只负责视图路由与全局状态（加载/错误/当前章节），
// 各屏的渲染与数据获取都拆到了 components/ 与 hooks/ 下。

import { useState } from 'react';
import { Spin } from 'antd';
import type { KnowledgeChapter } from './types';
import { useKnowledgeIndex } from './hooks/useKnowledgeIndex';
import ChapterHome from './components/ChapterHome';
import ItemGallery from './components/ItemGallery';
import { useLocale } from '../../store/LocaleContext';

interface KnowledgeBaseProps {
  onExit?: () => void;
}

export default function KnowledgeBase({ onExit }: KnowledgeBaseProps) {
  const { t } = useLocale();
  const { data, loading, error } = useKnowledgeIndex();
  const [open, setOpen] = useState<{ chapter: KnowledgeChapter; index: number } | null>(
    null,
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#999' }}>
          {t('knowledgebase.loading') || '正在加载知识库…'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: '#d93025', textAlign: 'center' }}>
        <h3>{t('knowledgebase.loadFailed') || '加载失败'}</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  if (open) {
    return (
      <ItemGallery
        chapter={open.chapter}
        chapterIndex={open.index}
        onBack={() => setOpen(null)}
        onExit={onExit}
      />
    );
  }

  return (
    <ChapterHome
      index={data}
      onSelect={(chapter, index) => setOpen({ chapter, index })}
      onExit={onExit}
    />
  );
}
