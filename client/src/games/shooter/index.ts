// client/src/games/shooter/index.ts
import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import ShooterGame from './ShooterGame';

const shooterEntry: GameEntry = {
  id: 'shooter',
  title: (t: (key: string) => string) => t('shooter.title'),
  description: (t: (key: string) => string) => t('shooter.description'),
  thumbnail: '/assets/shooter-thumb.png',
  component: ShooterGame,
  difficulty: 'medium',
  tags: ['action', 'arcade', 'shooter'],
};

GameManager.register(shooterEntry);

export default ShooterGame;