// client/src/books/EnglishVideo/components/VocabularyModal.tsx
//
// 单集的生字表：点卡片上的「生字」打开。
// 词从总生字表里按本集过滤，但频次按「本集出现次数」重算 ——
// 总频次对单集没意义（george 全 52 集出现 551 次，本集可能只有 3 次）。

import { useMemo } from 'react';
import { Modal } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import type { TranscriptLine, VideoItem, VocabularyWord } from '../types';
import VocabularyList from './VocabularyList';

interface VocabularyModalProps {
  item: VideoItem | null;
  /** 该集台词，用来算本集词频 */
  lines: TranscriptLine[];
  /** 总生字表 */
  words: VocabularyWord[];
  open: boolean;
  onClose: () => void;
}

export default function VocabularyModal({
  item,
  lines,
  words,
  open,
  onClose,
}: VocabularyModalProps) {
  const { locale, t } = useLocale();

  const epWords = useMemo(() => {
    if (!item || lines.length === 0) return [];
    const freq = new Map<string, number>();
    for (const l of lines) {
      const ws = (l.en.match(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’-]*/g) || []).map((w) =>
        w.toLowerCase(),
      );
      for (const w of ws) freq.set(w, (freq.get(w) || 0) + 1);
    }
    return words
      .filter((w) => freq.has(w.w))
      .map((w) => ({ ...w, freq: freq.get(w.w) as number }))
      .sort((a, b) => b.freq - a.freq);
  }, [item, lines, words]);

  const name = item
    ? locale === 'zh' && item.chineseName
      ? item.chineseName
      : item.englishName
    : '';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      title={`${name} · ${t('englishVideo.vocabTitle')}`}
      destroyOnHidden
    >
      <VocabularyList words={epWords} emptyText={t('englishVideo.vocabEmpty')} />
    </Modal>
  );
}
