// client/src/games/tictactoe/index.ts
console.log('tictactoe registering...');
import GameManager from '../../utils/GameManager';
import type { GameEntry } from '../../utils/GameManager';
import TicTacToeGame from './TicTacToeGame';

const tictactoeEntry: GameEntry = {
  id: 'tictactoe',
  title: (t: (key: string) => string) => t('tictactoe.title'),
  description: (t: (key: string) => string) => t('tictactoe.description'),
  thumbnail: '/assets/shooter-thumb.png',
  component: TicTacToeGame,
  difficulty: 'easy',
  tags: ['休闲', '益智', '对战'],
};

GameManager.register(tictactoeEntry);

export default TicTacToeGame;