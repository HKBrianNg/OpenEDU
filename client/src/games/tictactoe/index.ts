// client/src/games/tictactoe/index.ts

import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import TicTacToeGame from './TicTacToeGame';

const tictactoeEntry: GameEntry = {
  id: 'tictactoe',
  title: (t: (key: string) => string) => t('tictactoe.title'),
  description: (t: (key: string) => string) => t('tictactoe.description'),
  icon: '⭕', // 井字棋，用圈圈 emoji
  component: TicTacToeGame,
};

GameManager.register(tictactoeEntry);

export default TicTacToeGame;