// client/src/books/EnglishVideo/components/VideoCard.tsx
//
// 单部短片的卡片：名称 + 时长/年龄/出品方 + 简介 + 操作。
// 有台词才给「学习」「测验」；没有就只保留「去观看」。

import { Button, Card, Typography } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import type { VideoItem } from '../types';

const { Title, Paragraph, Text } = Typography;

interface VideoCardProps {
  item: VideoItem;
  /** 该片是否有可用台词（transcriptFile 存在且 lines 非空） */
  hasTranscript: boolean;
  /** 点「去观看」进站内观看页（不再开新 tab） */
  onWatch?: (item: VideoItem) => void;
  onLearn?: (item: VideoItem) => void;
  onQuiz?: (item: VideoItem) => void;
  /** 打开本集生字表 */
  onVocab?: (item: VideoItem) => void;
}

function MetaChip({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 9px',
        borderRadius: 99,
        background: '#f4f6f8',
        color: '#666',
        fontSize: 12,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ opacity: 0.65 }}>{label}</span>
      {value}
    </span>
  );
}

export default function VideoCard({
  item,
  hasTranscript,
  onWatch,
  onLearn,
  onQuiz,
  onVocab,
}: VideoCardProps) {
  const { locale, t } = useLocale();
  const isZh = locale === 'zh';
  const name = isZh && item.chineseName ? item.chineseName : item.englishName;
  const sub = isZh ? item.englishName : item.chineseName;
  const desc = isZh ? item.description : item.descriptionEn || item.description;

  return (
    <Card
      hoverable
      style={{ borderRadius: 12, border: '1px solid #eee', height: '100%' }}
      styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', height: '100%' } }}
    >
      <Title level={5} style={{ margin: '0 0 2px', fontSize: 16 }}>
        {name}
      </Title>
      {sub && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {sub}
        </Text>
      )}
      {item.episode && (
        <div style={{ marginTop: 2 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {item.episode}
          </Text>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
        <MetaChip label={t('englishVideo.episodeDuration')} value={item.durationPerEpisode} />
        <MetaChip label={t('englishVideo.ageRange')} value={item.ageRange} />
        <MetaChip label={t('englishVideo.producer')} value={item.producer} />
        <MetaChip label={t('englishVideo.platform')} value={item.platform || ''} />
      </div>

      <Paragraph
        style={{ color: '#555', fontSize: 13, marginBottom: 14, flex: 1 }}
        ellipsis={{ rows: 4, tooltip: desc }}
      >
        {desc}
      </Paragraph>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* 站内观看页：视频 + 台词同屏；真实链接才内嵌，搜索页自动降级 */}
        <Button type="primary" onClick={() => onWatch?.(item)} style={{ borderRadius: 99 }}>
          {t('englishVideo.watch')}
        </Button>
        {hasTranscript ? (
          <>
            <Button onClick={() => onLearn?.(item)} style={{ borderRadius: 99 }}>
              {t('englishVideo.learn')}
            </Button>
            <Button onClick={() => onQuiz?.(item)} style={{ borderRadius: 99 }}>
              {t('englishVideo.quiz')}
            </Button>
            <Button onClick={() => onVocab?.(item)} style={{ borderRadius: 99 }}>
              {t('englishVideo.vocab')}
            </Button>
          </>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('englishVideo.noLines')}
          </Text>
        )}
      </div>
    </Card>
  );
}
