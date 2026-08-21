import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Select, Button } from 'antd';
import { PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { ShooterScene } from './ShooterScene';
import { useLocale } from '../../store/LocaleContext';

interface ShooterGameProps {
  isMobile?: boolean;
  onExit?: () => void;
}

const ShooterGame: React.FC<ShooterGameProps> = ({ isMobile = false, onExit }) => {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);

  const canvasWidth = isMobile ? Math.min(window.innerWidth - 20, 648) : 649;
  const canvasHeight = isMobile ? canvasWidth * 0.776 : 503;

  useEffect(() => {
    if (!containerRef.current) return;

    (window as any).__t = t;
    (window as any).__paused = false; // 初始化暂停标志

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: canvasWidth,
      height: canvasHeight,
      parent: containerRef.current,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [ShooterScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      banner: false,
      input: { activePointers: 2 },
    };

    gameRef.current = new Phaser.Game(config);
    gameRef.current.events.once('ready', () => {
      gameRef.current?.scene.getScene('ShooterScene')?.scene.start('ShooterScene', { level });
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      delete (window as any).__t;
      delete (window as any).__paused;
    };
  }, [canvasWidth, canvasHeight, t]);

  const restart = (newLevel: number) => {
    const scene = gameRef.current?.scene.getScene('ShooterScene');
    if (scene) scene.scene.restart({ level: newLevel });
  };

  const handleLevelChange = (value: number) => {
    setLevel(value);
    restart(value);
  };

  const handleRestart = () => restart(level);

  const handleExit = () => {
    gameRef.current?.destroy(true);
    gameRef.current = null;
    onExit?.();
  };

  // 暂停/继续切换
  const togglePause = () => {
    const newPaused = !paused;
    setPaused(newPaused);
    (window as any).__paused = newPaused;

    const scene = gameRef.current?.scene.getScene('ShooterScene');
    if (scene) {
      if (newPaused) {
        scene.physics.pause();
        scene.tweens.pauseAll();
      } else {
        scene.physics.resume();
        scene.tweens.resumeAll();
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start', gap: 12 }}>
      <div
        ref={containerRef}
        style={{
          width: canvasWidth + 20,
          height: canvasHeight + 20,
          border: '2px solid #333',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          flexShrink: 0,
        }}
      />
      <div style={{ width: isMobile ? '100%' : 189, paddingTop: isMobile ? 0 : 6 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>{t('shooter.selectLevel')}</div>
          <Select
            value={level}
            onChange={handleLevelChange}
            options={Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `Level ${i + 1}` }))}
            style={{ width: '100%' }}
          />
        </div>
        <Button onClick={handleRestart} block style={{ marginBottom: 8 }}>
          {t('shooter.restart')}
        </Button>
        {/* 暂停/继续按钮 */}
        <Button
          block
          style={{ marginBottom: 8 }}
          icon={paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          onClick={togglePause}
        >
          {paused ? (t('shooter.resume') || '继续') : (t('shooter.pause') || '暂停')}
        </Button>
        <Button danger block onClick={handleExit}>
          {t('shooter.exitGame')}
        </Button>
      </div>
    </div>
  );
};

export default ShooterGame;