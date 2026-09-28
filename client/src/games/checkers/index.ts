// client/src/games/checker/index.ts

import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import CheckerGame from './CheckerGame.tsx';

const checkerEntry: GameEntry = {
  id: 'checker',
  title: (t: (key: string) => string) => t('checker.title'),
  description: (t: (key: string) => string) => t('checker.description'),
  thumbnail: '/assets/checker-thumb.png', // 记得替换为波子棋的缩略图路径
  component: CheckerGame,
  difficulty: 'medium', // 波子棋有一定策略性，设为中等难度
  tags: ['棋类', '策略', '对战'],
};

GameManager.register(checkerEntry);

export default CheckerGame;