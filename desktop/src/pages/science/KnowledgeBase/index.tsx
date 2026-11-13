// desktop/src/pages/science/KnowledgeBase/index.tsx

import { useState } from 'react';
import { Spin } from 'antd';
import type { KnowledgeChapter } from './types';
import { useKnowledgeIndex } from './hooks/useKnowledgeIndex';
import ChapterHome from './components/ChapterHome';
import ItemGallery from './components/ItemGallery';
import { useLocale } from '../../../store/LocaleContext';

import './knowledgeBase.css';

export function KnowledgeBase() {
  const { t } = useLocale();
  const { data, loading, error } = useKnowledgeIndex();
  const [open, setOpen] = useState<{ chapter: KnowledgeChapter; index: number } | null>(null);

  if (loading) {
    return (
      <div className="knowledge-base-scroll" style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#999' }}>
          {t('knowledgebase.loading') || '正在加载知识库…'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="knowledge-base-scroll" style={{ padding: 40, color: '#d93025', textAlign: 'center' }}>
        <h3>{t('knowledgebase.loadFailed') || '加载失败'}</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  if (open) {
    return (
      <div className="knowledge-base-scroll">
        <ItemGallery
          chapter={open.chapter}
          chapterIndex={open.index}
          onBack={() => setOpen(null)}
        />
      </div>
    );
  }

  return (
    <div className="knowledge-base-scroll">
      <ChapterHome
        index={data}
        onSelect={(chapter, index) => setOpen({ chapter, index })}
      />
    </div>
  );
}

KnowledgeBase.displayName = 'KnowledgeBase';