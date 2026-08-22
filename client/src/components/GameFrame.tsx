import React, { useState } from 'react';
import { Card, Button, Empty } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import GameManager from '../utils/GameManager';
import type { GameEntry } from '../utils/GameManager';

const GameFrame: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const games = GameManager.getAll();
  const selectedGame: GameEntry | undefined = selectedId
    ? GameManager.get(selectedId)
    : undefined;

  // ---- 游戏中 ----
  if (selectedGame) {
    const GameComponent = selectedGame.component;
    return (
      <div style={{ padding: 12 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => setSelectedId(null)}
          style={{ marginBottom: 16 }}
        >
          返回大厅
        </Button>
        <GameComponent
          isMobile={window.innerWidth < 768}
          onExit={() => setSelectedId(null)}
        />
      </div>
    );
  }

  // ---- 大厅 ----
  if (games.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Empty description="暂无游戏" />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 12px' }}>
      <h2 style={{ marginBottom: 20, fontSize: 22, fontWeight: 600 }}>
        游戏大厅
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {games.map((game) => (
          <Card
            key={game.id}
            hoverable
            cover={
              <div
                style={{
                  height: 140,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                }}
              >
                🎮
              </div>
            }
            onClick={() => setSelectedId(game.id)}
          >
            <Card.Meta
              title={game.title}
              description={game.description || game.tags?.join(' · ') || ''}
            />
            {game.difficulty && (
              <div style={{ marginTop: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background:
                      game.difficulty === 'easy'
                        ? '#52c41a33'
                        : game.difficulty === 'medium'
                        ? '#faad1433'
                        : '#ff4d4f33',
                    color:
                      game.difficulty === 'easy'
                        ? '#52c41a'
                        : game.difficulty === 'medium'
                        ? '#faad14'
                        : '#ff4d4f',
                  }}
                >
                  {game.difficulty}
                </span>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GameFrame;