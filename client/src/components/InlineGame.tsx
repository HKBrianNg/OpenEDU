import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Select, Button, Space } from 'antd';
import { PlayScene } from '../game/PlayScene'; // 注意大小写与文件名一致

const InlineGame: React.FC = () => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    if (!gameContainer.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 768,
      height: 588,
      parent: gameContainer.current,
      physics: { default: 'arcade', arcade: { gravity: { x:0, y: 0 }, debug: false } },
      scene: [PlayScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      banner: false,
    };

    gameInstance.current = new Phaser.Game(config);
    gameInstance.current.events.on('ready', () => {
      gameInstance.current?.scene.getScene('PlayScene')?.scene.start('PlayScene', { level });
    });

    return () => {
      gameInstance.current?.destroy(true);
      gameInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!gameInstance.current) return;
    const scene = gameInstance.current.scene.getScene('PlayScene');
    if (scene && scene.scene.isActive()) scene.scene.restart({ level });
  }, [level]);

  const handleRestart = () => {
    const scene = gameInstance.current?.scene.getScene('PlayScene');
    if (scene) scene.scene.restart({ level });
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <Space style={{ marginBottom: 12 }}>
        <Select
          value={level}
          onChange={(val) => setLevel(val)}
          options={Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `Level ${i + 1}` }))}
          style={{ width: 132 }}
        />
        <Button onClick={handleRestart}>重新开始</Button>
      </Space>
      <div
        ref={gameContainer}
        style={{
          width: 783,
          height: 607,
          margin: '0 auto',
          border: '2px solid #333',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      />
    </div>
  );
};

export default InlineGame;