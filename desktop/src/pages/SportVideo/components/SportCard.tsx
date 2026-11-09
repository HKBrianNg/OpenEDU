// desktop/src/pages/SportVideo/components/SportCard.tsx
import { Card, Button, Tag } from 'antd';
import type { SportItem } from '../types';
import { getCurrentLocale } from '../../../utils/locale';

interface SportCardProps {
  item: SportItem;
  onClick: () => void;
}

export function SportCard({ item, onClick }: SportCardProps) {
  const locale = getCurrentLocale();
  const title = locale.startsWith('zh') ? item.chineseName : item.englishName;
  const desc = locale.startsWith('zh') ? item.description : item.descriptionEn;

  return (
    <Card
      hoverable
      styles={{
        body: {
          padding: 16
        }
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>
          {title}
        </h3>
        <div style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
          {locale.startsWith('zh') ? item.englishName : item.chineseName}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {item.durationPerEpisode && (
            <Tag color="default">时长 {item.durationPerEpisode}</Tag>
          )}
          {item.channel && (
            <Tag color="default">频道 {item.channel}</Tag>
          )}
          {item.platform && (
            <Tag color="default">平台 {item.platform}</Tag>
          )}
        </div>

        <p style={{ color: '#444', margin: '0 0 16px', minHeight: 44 }}>
          {desc}
        </p>
      </div>

      <Button
        block
        type="primary"
        onClick={onClick}
        style={{
          backgroundColor: '#ff4444',
          borderColor: '#ff4444',
          borderRadius: 999
        }}
      >
        观看
      </Button>
    </Card>
  );
}
