// client/src/games/shooter/index.ts
import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import ShooterGame from './ShooterGame';

const shooterEntry: GameEntry = {
  id: 'shooter',
  title: 'Space Shooter',
  description: 'Classic top-down space shooter with multiple levels',
  thumbnail: '/assets/shooter-thumb.png', // 放一张图到 public/assets/ 下，没有也能跑（卡片用占位）
  component: ShooterGame,                 // 关键：挂的是 React 组件，不是 Phaser.Scene
  difficulty: 'medium',
  tags: ['action', 'arcade', 'shooter'],
};

GameManager.register(shooterEntry);

export default ShooterGame;