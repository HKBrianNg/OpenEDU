import React, { useState } from 'react';
import { Card, Empty } from 'antd';
import MusicManager from '../utils/MusicManager';
import type { MusicEntry } from '../utils/MusicManager';
import { useLocale } from '../store/LocaleContext';

const MusicFrame: React.FC = () => {
  const { t } = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const songs = MusicManager.getAll();
  const selectedMusic: MusicEntry | undefined = selectedId
    ? MusicManager.get(selectedId)
    : undefined;

  const resolveText = (value: string | ((t: (key: string) => string) => string)): string => {
    if (typeof value === 'function') {
      return value(t);
    }
    return value;
  };

  if (selectedMusic) {
    const MusicComponent = selectedMusic.component;
    return (
      <div style={{ padding: 12 }}>
        <MusicComponent onExit={() => setSelectedId(null)} />
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Empty description="暂无书" />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 12px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {songs.map((song) => (
          <Card
            key={song.id}
            hoverable
            cover={
              <div
                style={{
                  height: 140,
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                }}
              >
                {song.icon}
              </div>
            }
            onClick={() => setSelectedId(song.id)}
          >
            <Card.Meta
              title={resolveText(song.title)}
              description={song.description ? resolveText(song.description) : ''}
            />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MusicFrame;