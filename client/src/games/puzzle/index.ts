// src/games/puzzle/index.ts

import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import PuzzleGame from './PuzzleGame';

const puzzleEntry: GameEntry = {
  id: 'puzzle',
  title: (t: (key: string) => string) => t('puzzle.title'),
  description: (t: (key: string) => string) => t('puzzle.description'),
  // 后续你需要在 public/assets 下放一张拼图的预览图
  thumbnail: '/assets/puzzle-thumb.png', 
  component: PuzzleGame,
  difficulty: 'medium',
  tags: ['益智', '休闲', '图片'],
};

GameManager.register(puzzleEntry);

export default PuzzleGame;