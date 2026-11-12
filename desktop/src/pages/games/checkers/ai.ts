// src/games/checker/ai.ts
import { getValidMoves } from './Rules';
import type { Position, BoardState } from './Rules';

/**
 * 计算 AI (蓝方) 的最佳移动
 * @param board - 当前棋盘状态
 * @returns 最佳移动坐标 { from, to }，如果没有合法移动则返回 null
 */
export function calculateAiMove(board: BoardState): { from: Position; to: Position } | null {
  const allBluePieces: Position[] = [];
  
  // 1. 找出棋盘上所有的蓝方棋子
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === 'blue') {
        allBluePieces.push({ r, c });
      }
    }
  }

  let bestMove: { from: Position; to: Position } | null = null;
  let maxScore = -9999;

  // 2. 遍历所有棋子，计算所有合法移动并打分
  for (const piece of allBluePieces) {
    const moves = getValidMoves(board, piece);
    
    for (const move of moves) {
      let score = 0;
      
      // 【核心修复】蓝方的目标是 r=10（向下走），所以 目标r - 原始r 越大越好
      score += (move.r - piece.r) * 10; 
      
      // 连跳加分 (跳跃通常距离大于2)
      const dist = Math.abs(piece.r - move.r) + Math.abs(piece.c - move.c);
      if (dist > 2) score += 50; 

      // 加入一点随机性，避免 AI 走法太死板
      score += Math.random() * 5;

      if (score > maxScore) {
        maxScore = score;
        bestMove = { from: piece, to: move };
      }
    }
  }

  return bestMove;
}