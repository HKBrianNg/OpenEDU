// client/src/games/tilematching/index.ts

import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import TileMatchingGame from './TileMatchingGame';

const tileMatchingEntry: GameEntry = {
  id: 'tilematching',
  title: (t: (key: string) => string) => t('tilematching.title'),
  description: (t: (key: string) => string) => t('tilematching.description'),
  icon: '🀄', // 麻将牌 emoji，贴合消除/麻将玩法
  component: TileMatchingGame,
};

GameManager.register(tileMatchingEntry);

export default TileMatchingGame;