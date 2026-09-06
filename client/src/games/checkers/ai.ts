// src/games/checker/ai.ts

import type { BoardState, Player, Position  } from './Rules';

import { isValidPos, getValidMoves } from './Rules';

/**
 * 评估函数：给当前局面打分
 * 分数越高，对 Blue (AI) 越有利
 */
const evaluateBoard = (board: BoardState): number => {
  let score = 0;
  
  for (let r = 0; r < 17; r++) {
    for (let c = 0; c < 17; c++) {
      if (!isValidPos(r, c)) continue;
      const piece = board[r][c];
      
      if (piece === 'blue') {
        // AI (Blue) 想要去 r > 12 的区域 (下方)
        // 离目标越近，分数越高
        score += r; 
      } else if (piece === 'red') {
        // 玩家 (Red) 想要去 r < 4 的区域 (上方)
        // 离目标越近，扣分越多 (因为这是对手的进展)
        score -= (16 - r);
      }
    }
  }
  return score;
};

/**
 * AI 决策核心
 * @param board 当前棋盘
 * @param player 当前执棋方 ('blue')
 */
export const getBestMove = (board: BoardState, player: Player): { from: Position, to: Position } | null => {
  let bestScore = -Infinity;
  let bestMove: { from: Position, to: Position } | null = null;

  // 1. 收集所有己方棋子
  const myPieces: Position[] = [];
  for (let r = 0; r < 17; r++) {
    for (let c = 0; c < 17; c++) {
      if (board[r][c] === player) {
        myPieces.push({ r, c });
      }
    }
  }

  // 2. 遍历每个棋子的所有合法走法
  myPieces.forEach(fromPos => {
    const validMoves = getValidMoves(board, fromPos);
    
    validMoves.forEach(toPos => {
      // 模拟移动
      const newBoard = board.map(row => [...row]);
      newBoard[toPos.r][toPos.c] = player;
      newBoard[fromPos.r][fromPos.c] = null;

      // 评分
      const currentScore = evaluateBoard(newBoard);
      
      // 增加一点随机性，防止AI走法太死板
      const randomFactor = Math.random() * 2; 

      if (currentScore + randomFactor > bestScore) {
        bestScore = currentScore + randomFactor;
        bestMove = { from: fromPos, to: toPos };
      }
    });
  });

  return bestMove;
};