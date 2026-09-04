console.log('jungle registering...');
import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import JungleGame from './JundleGame';

const jungleEntry: GameEntry = {
  id: 'jungle',
  title: (t: (key: string) => string) => t('jungle.title'),
  description: (t: (key: string) => string) => t('jungle.description'),
  thumbnail: '/assets/shooter-thumb.png',
  component: JungleGame,
  difficulty: 'medium',
  tags: ['棋类', '策略', '对战'],
};

GameManager.register(jungleEntry);

export default JungleGame;