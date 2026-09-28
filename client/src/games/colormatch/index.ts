// client/src/games/colormatch/index.ts
console.log('colormatch registering...');
import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import ColorMatchGame from './ColorMatchGame';

const colorMatchEntry: GameEntry = {
  id: 'colormatch',
  title: (t: (key: string) => string) => t('colorMatch.title'),           // ✅ 函数形式
  description: (t: (key: string) => string) => t('colorMatch.description'), // ✅ 函数形式
  thumbnail: '/assets/shooter-thumb.png',
  component: ColorMatchGame,
  difficulty: 'easy',
  tags: ['休闲', '益智', '消除'],
};

GameManager.register(colorMatchEntry);

export default ColorMatchGame;