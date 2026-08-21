import React, { useEffect, useRef } from 'react';
import gameManager from '../utils/GameManager';

interface GameCanvasProps {
  sceneKey: string;
  sceneClass: typeof Phaser.Scene;
  initialData?: Record<string, any>;
  width?: number;
  height?: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  sceneKey,
  sceneClass,
  initialData = {},
  width = 740,
  height = 540,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // 初始化全局游戏实例（仅第一次挂载时）
    gameManager.init(containerRef.current, width, height);
    // 注册场景（若尚未注册）
    gameManager.registerScene(sceneKey, sceneClass);
    // 启动场景
    gameManager.startScene(sceneKey, initialData);

    // 组件卸载时不销毁 game，只做清理（比如暂停当前场景）
    return () => {
      // 可选：停止当前场景
      const scene = gameManager.game?.scene.getScene(sceneKey);
      if (scene) scene.scene.stop();
    };
  }, [sceneKey, sceneClass]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, border: '2px solid #333', borderRadius: 10, overflow: 'hidden' }}
    />
  );
};

export default GameCanvas;