// client/src/books/SportsVideo/components/SportCard.tsx
//
// 单条短片的卡片：名称 + 频道/平台 + 简介 + 观看。
// 跟 EnglishVideo 的 VideoCard 同一副样子，只是没有「学习 / 测验 / 生字」那几个按钮。

import { Button, Card, Typography } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import type { SportItem } from '../types';

const { Title, Paragraph, Text } = Typography;

function Chip({ label, value }: { label: string; value: string }) {
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

interface SportCardProps {
  item: SportItem;
  /** 进站内观看页（不开新标签） */
  onWatch: (item: SportItem) => void;
}

export default function SportCard({ item, onWatch }: SportCardProps) {
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
        <Chip label={t('sportsVideo.duration')} value={item.durationPerEpisode || ''} />
        <Chip label={t('sportsVideo.channel')} value={item.channel || ''} />
        <Chip label={t('sportsVideo.platform')} value={item.platform || ''} />
      </div>

      <Paragraph
        style={{ color: '#555', fontSize: 13, marginBottom: 14, flex: 1 }}
        ellipsis={{ rows: 4, tooltip: desc }}
      >
        {desc}
      </Paragraph>

      <Button type="primary" onClick={() => onWatch(item)} style={{ borderRadius: 99 }}>
        {t('sportsVideo.watch')}
      </Button>
    </Card>
  );
}
