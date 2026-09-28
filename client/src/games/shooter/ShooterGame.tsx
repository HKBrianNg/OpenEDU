import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { ShooterScene } from './ShooterScene';
import { useLocale } from '../../store/LocaleContext';
import { useGameStatus } from '../../store/GameStatusContext';

interface Props {
  onExit?: () => void;
}

const ShooterGame: React.FC<Props> = ({ onExit }) => {
  const { t } = useLocale();
  const { setActiveGame } = useGameStatus();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const [lives, setLives] = useState(3);
  const [fireRate, setFireRate] = useState(680);

  const [gameStarted, setGameStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setActiveGame('shooter');
    return () => {
      setActiveGame(null);
    };
  }, [setActiveGame]);

  const getI18n = () => ({
    score: t('shooter.score'),
    lives: t('shooter.lives'),
    level: t('shooter.level'),
    youWin: t('shooter.youWin'),
    gameOver: t('shooter.gameOver'),
    getReady: t('shooter.getReady'),
    pressSpaceRestart: t('shooter.pressSpaceRestart'),
    fireRate: t('shooter.fireRate'),
    respawnTime: t('shooter.respawnTime'),
  });

  const handleStart = () => {
    const i18n = getI18n();

    if (!gameRef.current) {
      if (!containerRef.current) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 375,
        height: 420,
        backgroundColor: '#000',
        scene: [ShooterScene],
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
          width: 375,
          height: 420,
        },
      };

      gameRef.current = new Phaser.Game(config);

      gameRef.current.events.once('ready', () => {
        const scene = gameRef.current!.scene.getScene('ShooterScene') as any;
        scene.scene.start('ShooterScene', { lives, fireRate, i18n });
        scene.registry.set('fireRate', fireRate);
      });

      setGameStarted(true);
      return;
    }

    const scene = gameRef.current.scene.getScene('ShooterScene') as any;
    scene.scene.restart({ lives, fireRate, i18n });
    scene.registry.set('fireRate', fireRate);
    setPaused(false);
    setGameStarted(true);
  };

  const handlePause = () => {
    if (!gameRef.current) return;
    const scene = gameRef.current.scene.getScene('ShooterScene') as any;
    if (paused) {
      scene.scene.resume();
      setPaused(false);
    } else {
      scene.scene.pause();
      setPaused(true);
    }
  };

  const handleExitToLobby = () => {
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    setGameStarted(false);
    setPaused(false);
    setActiveGame(null);
    onExit?.();
  };

  useEffect(() => {
    if (gameStarted && gameRef.current) {
      const scene = gameRef.current.scene.getScene('ShooterScene') as any;
      scene?.registry?.set('fireRate', fireRate);
    }
  }, [fireRate, gameStarted]);

  useEffect(() => {
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        minHeight: '100vh',
        background: '#f3f4f6',
        padding: 8,
      }}
    >
      {/* 控制面板（上） */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: '100%',
          maxWidth: 460,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: '#1f2937',
            padding: 12,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <h3
            style={{
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              textAlign: 'center',
              borderBottom: '1px solid #4b5563',
              paddingBottom: 6,
              margin: 0,
            }}
          >
            {t('shooter.controlPanel')}
          </h3>

          {/* fireRate */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>
                {t('shooter.fireRate')}
              </label>
              <span
                style={{
                  color: '#facc15',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  background: '#374151',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {fireRate}ms
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={fireRate}
              onChange={(e) => setFireRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#eab308' }}
            />
          </div>

          {/* lives */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>
                {t('shooter.lives')}
              </label>
              <span
                style={{
                  color: '#f87171',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  background: '#374151',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {lives}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={lives}
              onChange={(e) => setLives(Number(e.target.value))}
              disabled={gameStarted}
              style={{ width: '100%', accentColor: '#f87171', opacity: gameStarted ? 0.4 : 1 }}
            />
          </div>
        </div>

        {/* 按钮区 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleStart}
            style={{
              flex: 1,
              padding: '8px 0',
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {gameStarted ? t('shooter.restart') : t('shooter.startGame')}
          </button>

          {gameStarted && (
            <button
              onClick={handlePause}
              style={{
                flex: 1,
                padding: '8px 0',
                background: '#ca8a04',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {paused ? t('shooter.resume') : t('shooter.pause')}
            </button>
          )}

          <button
            onClick={handleExitToLobby}
            style={{
              flex: 1,
              padding: '8px 0',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {t('shooter.exitGame')}
          </button>
        </div>
      </div>

      {/* Canvas（下） */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div
          ref={containerRef}
          style={{
            width: Math.min(375, typeof window !== 'undefined' ? window.innerWidth - 24 : 351),
            height: 420,
            border: '3px solid #6b7280',
            borderRadius: 8,
            overflow: 'hidden',
            background: '#000',
          }}
        />
      </div>
    </div>
  );
};

export default ShooterGame;