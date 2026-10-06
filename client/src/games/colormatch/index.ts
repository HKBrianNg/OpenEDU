// client/src/games/colormatch/index.ts

import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import ColorMatchGame from './ColorMatchGame';

const colorMatchEntry: GameEntry = {
  id: 'colormatch',
  title: (t: (key: string) => string) => t('colorMatch.title'),
  description: (t: (key: string) => string) => t('colorMatch.description'),
  icon: '🎨', // 用 emoji 替代 thumbnail
  component: ColorMatchGame,
};

GameManager.register(colorMatchEntry);

export default ColorMatchGame;