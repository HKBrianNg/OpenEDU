// client/src/games/xiangqi/index.ts

import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import XiangqiGame from './XiangqiGame';

const xiangqiEntry: GameEntry = {
  id: 'xiangqi',
  title: (t: (key: string) => string) => t('xiangqi.title'),
  description: (t: (key: string) => string) => t('xiangqi.description'),
  icon: '♟️', // 象棋，用棋子 emoji
  component: XiangqiGame,
};

GameManager.register(xiangqiEntry);

export default XiangqiGame;