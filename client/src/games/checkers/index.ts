// client/src/games/checkers/index.ts

import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import CheckerGame from './CheckerGame.tsx';

const checkerEntry: GameEntry = {
  id: 'checker',
  title: (t: (key: string) => string) => t('checker.title'),
  description: (t: (key: string) => string) => t('checker.description'),
  icon: '♟️', // 用 emoji 或图标，替代 thumbnail
  component: CheckerGame,
};

GameManager.register(checkerEntry);

export default CheckerGame;