import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { PlayScene } from '../game/PlayScene';

// ✅ 修复3：移除未使用的 React 导入（如果文件里没用到 React 其他 API）
// 如果用到 useState 等请保留：import React, { useEffect, useRef, useState } from 'react';

export interface GameCanvasHandle {
  restart: (level: number) => void;
}

interface GameCanvasProps {
  initialLevel?: number;
}

// ✅ 修复4：移除 : React.FC 标注，让 forwardRef 自己推断类型
// ✅ 修复5：为 forwardRef 提供泛型参数 <GameCanvasHandle, GameCanvasProps>
const GameCanvas = React.forwardRef<GameCanvasHandle, GameCanvasProps>(
  ({ initialLevel = 1 }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameInstance = useRef<Phaser.Game | null>(null);

    useEffect(() => {
      if (!containerRef.current) return;
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 600,
        height: 460,
        parent: containerRef.current,
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scene: [PlayScene],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        banner: false,
      };
      gameInstance.current = new Phaser.Game(config);
      gameInstance.current.events.once('ready', () => {
        gameInstance.current?.scene.getScene('PlayScene')?.scene.start('PlayScene', { level: initialLevel });
      });

      return () => {
        gameInstance.current?.destroy(true);
        gameInstance.current = null;
      };
    }, []);

    React.useImperativeHandle(ref, () => ({
      restart: (level: number) => {
        const scene = gameInstance.current?.scene.getScene('PlayScene');
        if (scene) scene.scene.restart({ level });
      },
    }));

    return (
      <div
        ref={containerRef}
        style={{
          width: 596,
          height: 458,
          border: '2px solid #333',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      />
    );
  }
);

GameCanvas.displayName = 'GameCanvas';
export default GameCanvas;