import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { ShooterScene } from './ShooterScene';
import { useLocale } from '../../store/LocaleContext';
import { useGameStatus } from '../../store/GameStatusContext';

const ShooterGame: React.FC = () => {
  const { t } = useLocale();
  const { setActiveGame } = useGameStatus();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const [lives, setLives] = useState(3);
  const [fireRate, setFireRate] = useState(680);
  const [respawnTime, setRespawnTime] = useState(1.26);

  const [gameStarted, setGameStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  // ---- 组件一挂载就标记"游戏在跑"，卸载时清除 ----
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
        width: 800,
        height: 600,
        backgroundColor: '#000',
        scene: [ShooterScene],
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
      };

      gameRef.current = new Phaser.Game(config);

      gameRef.current.events.once('ready', () => {
        const scene = gameRef.current!.scene.getScene('ShooterScene') as any;
        scene.scene.start('ShooterScene', { lives, respawnTime, fireRate, i18n });
        scene.registry.set('fireRate', fireRate);
      });

      setGameStarted(true);
      return;
    }

    const scene = gameRef.current.scene.getScene('ShooterScene') as any;
    scene.scene.restart({ lives, respawnTime, fireRate, i18n });
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

  const handleExit = () => {
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    setGameStarted(false);
    setPaused(false);
    setActiveGame(null); // ← 清除标记
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
    <div className="flex flex-row items-start justify-center gap-8 p-6 bg-gray-100 min-h-screen">
      {/* 左侧：画布 */}
      <div
        ref={containerRef}
        className="border-2 border-gray-600 rounded overflow-hidden shadow-lg bg-black"
      />

      {/* 右侧：控制面板 */}
      <div className="flex flex-col gap-6 w-72">
        {/* Slider 面板 */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-6">
          <h3 className="text-white text-lg font-bold text-center border-b border-gray-600 pb-3">
            {t('shooter.controlPanel') || 'Game Controls'}
          </h3>

          {/* Fire Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white text-sm font-medium">{t('shooter.fireRate')}</label>
              <span className="text-yellow-400 text-sm font-mono bg-gray-700 px-2 py-0.5 rounded">{fireRate}ms</span>
            </div>
            <input
              type="range" min={50} max={2000} step={50}
              value={fireRate}
              onChange={(e) => setFireRate(Number(e.target.value))}
              className="w-full accent-yellow-400"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Fast</span>
              <span>Slow</span>
            </div>
          </div>

          {/* Lives */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white text-sm font-medium">{t('shooter.lives')}</label>
              <span className="text-red-400 text-sm font-mono bg-gray-700 px-2 py-0.5 rounded">{lives}</span>
            </div>
            <input
              type="range" min={1} max={10} step={1}
              value={lives}
              onChange={(e) => setLives(Number(e.target.value))}
              disabled={gameStarted}
              className="w-full accent-red-400 disabled:opacity-40"
            />
          </div>

          {/* Respawn Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white text-sm font-medium">{t('shooter.respawnTime')}</label>
              <span className="text-cyan-400 text-sm font-mono bg-gray-700 px-2 py-0.5 rounded">{respawnTime}s</span>
            </div>
            <input
              type="range" min={0.5} max={5} step={0.5}
              value={respawnTime}
              onChange={(e) => setRespawnTime(Number(e.target.value))}
              disabled={gameStarted}
              className="w-full accent-cyan-400 disabled:opacity-40"
            />
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleStart}
            className="w-full py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg font-bold text-base shadow-lg transition-colors"
          >
            {gameStarted ? t('shooter.restart') : t('shooter.startGame')}
          </button>

          {gameStarted && (
            <button
              onClick={handlePause}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white rounded-lg font-bold text-base shadow-lg transition-colors"
            >
              {paused ? t('shooter.resume') : t('shooter.pause')}
            </button>
          )}

          {gameStarted && (
            <button
              onClick={handleExit}
              className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg font-bold text-base shadow-lg transition-colors"
            >
              {t('shooter.exitGame')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShooterGame;