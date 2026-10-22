// client/src/books/EnglishVideo/components/ClozePractice.tsx
//
// 台词填空测验：给中文和挖了空的英文句，补上缺的那段。
// 挖哪个词见 utils/cloze.ts 的 resolveBlank（台词里写了 blank 就用它，否则自动挑）。
// 判分忽略大小写/标点/空格。

import { useState } from 'react';
import { Button, Input, Modal, Progress, Typography } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import { isAnswerCorrect, buildCloze, resolveBlank } from '../utils/cloze';
import type { TranscriptLine, VideoItem } from '../types';

const { Text, Title, Paragraph } = Typography;

interface ClozePracticeProps {
  item: VideoItem | null;
  lines: TranscriptLine[];
  open: boolean;
  onClose: () => void;
}

/**
 * 练习主体。靠 key 重建来重置进度 ——
 * 换片子或重新打开时用新 key，React 直接丢弃旧状态，
 * 不需要在 effect 里同步 setState（那会触发级联渲染）。
 */
function PracticeBody({ lines, onClose }: { lines: TranscriptLine[]; onClose: () => void }) {
  const { t } = useLocale();
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctSet, setCorrectSet] = useState<Set<number>>(new Set());

  const usable = lines.filter((l) => l.en);
  const total = usable.length;
  const current = usable[index];

  // 每句的挖空答案（自动挑或手动指定）
  const answer = current ? resolveBlank(current.en, current.blank) : '';
  const cloze = current ? buildCloze(current.en, answer) : '';

  if (total === 0) {
    return <div style={{ padding: '20px 0', color: '#888' }}>{t('englishVideo.transcriptEmpty')}</div>;
  }

  const check = () => {
    const typed = value.trim();
    if (!typed || !current) return;
    if (isAnswerCorrect(typed, answer)) {
      setResult('correct');
      setCorrectSet((prev) => new Set(prev).add(current.index));
    } else {
      setResult('wrong');
    }
  };

  const go = (delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= total) return;
    setIndex(next);
    setValue('');
    setResult(null);
    setRevealed(false);
  };

  const done = correctSet.size;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {(t('englishVideo.practiceProgress') || '第 {current} / {total} 句')
            .replace('{current}', String(index + 1))
            .replace('{total}', String(total))}
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {t('englishVideo.practiceCorrectCount')} {done}/{total}
        </Text>
      </div>
      <Progress percent={Math.round((done / total) * 100)} size="small" style={{ marginBottom: 18 }} />

      <Paragraph style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>{current.zh}</Paragraph>
      <Title level={4} style={{ margin: '0 0 4px', fontSize: 20, lineHeight: 1.6 }}>
        {cloze}
      </Title>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {t('englishVideo.practiceTip')}
      </Text>

      <Input
        value={value}
        autoFocus
        disabled={result === 'correct'}
        placeholder={t('englishVideo.practicePlaceholder')}
        onChange={(e) => {
          setValue(e.target.value);
          setResult(null);
        }}
        onPressEnter={check}
        style={{ marginTop: 14, borderRadius: 8 }}
      />

      {result === 'correct' && (
        <Text style={{ display: 'block', marginTop: 10, color: '#52c41a', fontSize: 14 }}>
          ✓ {t('englishVideo.practiceCorrect')}
        </Text>
      )}
      {result === 'wrong' && (
        <Text style={{ display: 'block', marginTop: 10, color: '#ff4d4f', fontSize: 14 }}>
          ✗ {t('englishVideo.practiceWrong')}
        </Text>
      )}
      {revealed && (
        <Text style={{ display: 'block', marginTop: 10, color: '#1976d2', fontSize: 14 }}>
          {t('englishVideo.practiceAnswer')}
          {answer}
        </Text>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
        <Button onClick={() => go(-1)} disabled={index === 0} style={{ borderRadius: 99 }}>
          {t('englishVideo.practicePrev')}
        </Button>
        {index === total - 1 ? (
          <Button type="primary" onClick={onClose} style={{ borderRadius: 99 }}>
            {t('englishVideo.practiceFinish')}
          </Button>
        ) : (
          <Button type="primary" onClick={() => go(1)} style={{ borderRadius: 99 }}>
            {t('englishVideo.practiceNext')}
          </Button>
        )}
        <Button
          onClick={check}
          disabled={!value.trim() || result === 'correct'}
          style={{ borderRadius: 99 }}
        >
          {t('englishVideo.practiceHint')}
        </Button>
        {result !== 'correct' && (
          <Button onClick={() => setRevealed(true)} style={{ borderRadius: 99 }}>
            {t('englishVideo.practiceReveal')}
          </Button>
        )}
      </div>
    </>
  );
}

export default function ClozePractice({ item, lines, open, onClose }: ClozePracticeProps) {
  const { t } = useLocale();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      title={item ? `${item.englishName} · ${t('englishVideo.practiceTitle')}` : ''}
      destroyOnHidden
    >
      {/* key 带上 open：每次打开都是全新一轮，进度自动清零 */}
      {item && <PracticeBody key={`${item.id}-${String(open)}`} lines={lines} onClose={onClose} />}
    </Modal>
  );
}
