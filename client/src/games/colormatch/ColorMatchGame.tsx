import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import ColorMatchScene, { type GameConfig } from './ColorMatchScene';
import { useLocale } from '../../store/LocaleContext';  // ✅ 导入国际化 hook

interface Props {
  onExit?: () => void;
}

const ColorMatchGame: React.FC<Props> = ({ onExit }) => {
  const { t } = useLocale();  // ✅ 获取翻译函数
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const [dropSpeed, setDropSpeed] = useState(400);
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(12);

  const [gameStarted, setGameStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const buildConfig = (): GameConfig => ({
    cols,
    rows,
    dropMs: dropSpeed,
    onScore: setScore,
    onGameOver: () => setGameOver(true),
  });

  const handleStart = () => {
    if (!gameRef.current) {
      if (!containerRef.current) return;

      const BLOCK_SIZE = 34;
      const WIDTH = cols * BLOCK_SIZE;
      const HEIGHT = rows * BLOCK_SIZE;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: '#0f0f1a',
        scene: [ColorMatchScene],
      };

      gameRef.current = new Phaser.Game(config);

      gameRef.current.events.once('ready', () => {
        const scene = gameRef.current!.scene.getScene('ColorMatchScene') as ColorMatchScene;
        if (scene) {
          scene.startGame(buildConfig());
        }
      });

      setGameStarted(true);
      setGameOver(false);
      setScore(0);
      return;
    }

    const scene = gameRef.current.scene.getScene('ColorMatchScene') as ColorMatchScene;
    if (scene) {
      scene.restart(buildConfig());
    }
    setPaused(false);
    setGameOver(false);
    setScore(0);
    setGameStarted(true);
  };

  const handlePause = () => {
    if (!gameRef.current) return;
    const scene = gameRef.current.scene.getScene('ColorMatchScene') as ColorMatchScene;
    if (paused) {
      scene.resume();
      setPaused(false);
    } else {
      scene.pause();
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
    setGameOver(false);
    setScore(0);
    onExit?.();
  };

  useEffect(() => {
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 16, minHeight: '100vh', background: '#f3f4f6', padding: 0, margin: 0 }}>
      
      {/* 左边：控制面板 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 220, flexShrink: 0, marginTop: 2 }}>
        
        {/* 面板主体 */}
        <div style={{ background: '#1f2937', padding: 16, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ color: 'white', fontSize: 14, fontWeight: 700, textAlign: 'center', borderBottom: '1px solid #4b5563', paddingBottom: 8, margin: 0 }}>
            {t('colorMatch.controlPanel')}
          </h3>

          {/* 下落速度 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>{t('colorMatch.dropSpeed')}</label>
              <span style={{ color: '#facc15', fontSize: 11, fontFamily: 'monospace', background: '#374151', padding: '2px 6px', borderRadius: 4 }}>{dropSpeed}ms</span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={dropSpeed}
              onChange={(e) => setDropSpeed(Number(e.target.value))}
              disabled={gameStarted}
              style={{ width: '100%', accentColor: '#eab308', opacity: gameStarted ? 0.4 : 1 }}
            />
          </div>

          {/* 列数 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>{t('colorMatch.cols')}</label>
              <span style={{ color: '#60a5fa', fontSize: 11, fontFamily: 'monospace', background: '#374151', padding: '2px 6px', borderRadius: 4 }}>{cols}</span>
            </div>
            <input
              type="range"
              min={4}
              max={12}
              step={1}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              disabled={gameStarted}
              style={{ width: '100%', accentColor: '#60a5fa', opacity: gameStarted ? 0.4 : 1 }}
            />
          </div>

          {/* 行数 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>{t('colorMatch.rows')}</label>
              <span style={{ color: '#a78bfa', fontSize: 11, fontFamily: 'monospace', background: '#374151', padding: '2px 6px', borderRadius: 4 }}>{rows}</span>
            </div>
            <input
              type="range"
              min={6}
              max={20}
              step={1}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              disabled={gameStarted}
              style={{ width: '100%', accentColor: '#a78bfa', opacity: gameStarted ? 0.4 : 1 }}
            />
          </div>

          {/* 分数显示 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid #4b5563', paddingTop: 12 }}>
            <div style={{ color: '#9ca3af', fontSize: 11 }}>{t('colorMatch.score')}</div>
            <div style={{ color: '#facc15', fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>{score}</div>
          </div>
        </div>

        {/* 按钮区 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={handleStart}
            style={{
              width: '100%', padding: '10px 0',
              background: gameOver ? '#2563eb' : '#16a34a',
              color: 'white', border: 'none', borderRadius: 8,
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {!gameStarted ? t('colorMatch.startGame') : t('colorMatch.restart')}
          </button>

          {gameStarted && (
            <button
              onClick={handlePause}
              style={{
                width: '100%', padding: '10px 0',
                background: '#ca8a04', color: 'white', border: 'none',
                borderRadius: 8, fontWeight: 700, fontSize: 14,
                cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {paused ? t('colorMatch.resume') : t('colorMatch.pause')}
            </button>
          )}

          <button
            onClick={handleExitToLobby}
            style={{
              width: '100%', padding: '10px 0',
              background: '#dc2626', color: 'white', border: 'none',
              borderRadius: 8, fontWeight: 700, fontSize: 14,
              cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {t('colorMatch.endGame')}
          </button>
        </div>
      </div>

      {/* 右边：Canvas */}
      <div style={{ position: 'relative' }}>
        <div
          ref={containerRef}
          style={{
            width: cols * 34,
            height: rows * 34,
            border: '3px solid #6b7280',
            borderRadius: 8,
            overflow: 'hidden',
            background: '#000',
            flexShrink: 0,
            marginTop: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        />

        {/* Game Over 遮罩 */}
        {gameOver && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              zIndex: 1000,
            }}
          >
            <div style={{ color: '#ef4444', fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
              {t('colorMatch.gameOver')}
            </div>
            <div style={{ color: 'white', fontSize: 18, marginBottom: 16 }}>
              {t('colorMatch.finalScore')}: {score}
            </div>
            <button
              onClick={handleStart}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '10px 24px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {t('colorMatch.playAgain')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorMatchGame;