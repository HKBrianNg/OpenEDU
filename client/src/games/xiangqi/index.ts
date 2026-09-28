import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import XiangqiGame from './XiangqiGame';

const xiangqiEntry: GameEntry = {
  id: 'xiangqi',
  title: (t: (key: string) => string) => t('xiangqi.title'),
  description: (t: (key: string) => string) => t('xiangqi.description'),
  thumbnail: '/assets/shooter-thumb.png',
  component: XiangqiGame,
  difficulty: 'medium',
  tags: ['棋类', '策略', '对战'],
};

GameManager.register(xiangqiEntry);

export default XiangqiGame;