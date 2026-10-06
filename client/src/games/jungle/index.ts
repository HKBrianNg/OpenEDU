// client/src/games/jungle/index.ts

import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import JungleGame from './JungleGame.tsx';

const jungleEntry: GameEntry = {
  id: 'jungle',
  title: (t: (key: string) => string) => t('jungle.title'),
  description: (t: (key: string) => string) => t('jungle.description'),
  icon: '🐯', // 斗兽棋，用老虎 emoji
  component: JungleGame,
};

GameManager.register(jungleEntry);

export default JungleGame;