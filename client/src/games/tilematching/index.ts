import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import TileMatchingGame from './TileMatchingGame';

const tileMatchingEntry: GameEntry = {
  id: 'tilematching',
  title: (t: (key: string) => string) => t('tilematching.title'),
  description: (t: (key: string) => string) => t('tilematching.description'),
  thumbnail: '/assets/tilematching-thumb.png',
  component: TileMatchingGame,
  difficulty: 'medium',
  tags: ['益智', '休闲', '麻将'],
};

GameManager.register(tileMatchingEntry);

export default TileMatchingGame;