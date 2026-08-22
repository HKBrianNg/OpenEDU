import React, { useState } from 'react';
import { Card, Empty } from 'antd';
import GameManager from '../utils/GameManager';
import type { GameEntry } from '../utils/GameManager';
import { useLocale } from '../store/LocaleContext'; // ✅ 导入 useLocale

const GameFrame: React.FC = () => {
  const { t } = useLocale(); // ✅ 获取翻译函数
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const games = GameManager.getAll();
  const selectedGame: GameEntry | undefined = selectedId
    ? GameManager.get(selectedId)
    : undefined;

  // ---- 辅助函数：解析 title/description ----
  const resolveText = (value: string | ((t: (key: string) => string) => string)): string => {
    if (typeof value === 'function') {
      return value(t);
    }
    return value;
  };

  // ---- 游戏中 ----
  if (selectedGame) {
    const GameComponent = selectedGame.component;
    return (
      <div style={{ padding: 12 }}>
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
              title={resolveText(game.title)}               // ✅ 支持函数
              description={game.description ? resolveText(game.description) : game.tags?.join(' · ') || ''} // ✅ 支持函数
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