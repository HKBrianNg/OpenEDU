// ai.ts
import type { Move, Piece, Side } from './types';
import { legalMoves } from './rules';
import { VAL } from './board';

const SIDE_RED: Side = 'r';
const SIDE_BLACK: Side = 'b';

// 搜索深度：3层 = AI走 + 玩家走 + AI走
const SEARCH_DEPTH = 3;

/**
 * 复制棋盘
 */
function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map(row => [...row]);
}

/**
 * 在棋盘上执行一步走子（直接修改传入的board）
 */
function applyMove(board: (Piece | null)[][], mv: Move): Piece | null {
  const captured = board[mv.tr][mv.tc];
  board[mv.tr][mv.tc] = board[mv.fr][mv.fc];
  board[mv.fr][mv.fc] = null;
  return captured;
}

/**
 * 撤销一步走子
 */
function undoMove(board: (Piece | null)[][], mv: Move, captured: Piece | null): void {
  board[mv.fr][mv.fc] = board[mv.tr][mv.tc];
  board[mv.tr][mv.tc] = captured;
}

/**
 * 动态子力价值
 */
function getDynamicValue(piece: Piece, row: number, board: (Piece | null)[][]): number {
  let base = VAL[piece.type];
  const totalPieces = board.flat().filter(x => x !== null).length;
  const isEndGame = totalPieces <= 12;

  if (piece.type === 'P') {
    const crossRiver = piece.side === SIDE_RED ? row <= 4 : row >= 5;
    if (crossRiver) base += 60;
  }
  if (isEndGame) {
    if (piece.type === 'C') base *= 0.75;
    if (piece.type === 'N') base *= 1.25;
  }
  return base;
}

/**
 * 位置加分
 */
function getPositionScore(piece: Piece, row: number, col: number): number {
  let score = 0;
  if (col === 4) score += 12;
  if (piece.type === 'R') {
    if (col === 3 || col === 5) score += 15;
  }
  if (piece.type === 'N') {
    if (row >= 2 && row <= 7 && col >= 2 && col <= 6) score += 18;
    if (row <= 1 || row >= 8 || col <= 1 || col >= 7) score -= 12;
  }
  if (piece.type === 'P') {
    if (piece.side === SIDE_RED && row <= 2) score += 20;
    if (piece.side === SIDE_BLACK && row >= 7) score += 20;
  }
  return score;
}

/**
 * 局面评估函数：正数对黑方(AI)有利，负数对红方(玩家)有利
 */
function evaluate(board: (Piece | null)[][]): number {
  let score = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = getDynamicValue(p, r, board) + getPositionScore(p, r, c);
      // 黑方(AI)加分，红方(玩家)减分
      score += p.side === SIDE_BLACK ? val : -val;
    }
  }
  return score;
}

/**
 * 走法排序：优先搜索吃子、将军的走法，提升αβ剪枝效率
 */
function orderMoves(board: (Piece | null)[][], moves: Move[]): Move[] {
  return moves.sort((a, b) => {
    const aCap = board[a.tr][a.tc] ? VAL[board[a.tr][a.tc]!.type] : 0;
    const bCap = board[b.tr][b.tc] ? VAL[board[b.tr][b.tc]!.type] : 0;
    return bCap - aCap;
  });
}

/**
 * Minimax + αβ剪枝递归搜索
 * maximizing: 当前是否为AI(黑方)回合（最大化分数）
 */
function minimax(
  board: (Piece | null)[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  side: Side
): number {
  // 到达搜索深度，返回局面评估
  if (depth === 0) {
    return evaluate(board);
  }

  const moves = legalMoves(board, side);
  // 无子可动：困毙或被将死
  if (moves.length === 0) {
    // 当前方无子可动，对当前方是坏事
    return maximizing ? -100000 + (SEARCH_DEPTH - depth) : 100000 - (SEARCH_DEPTH - depth);
  }

  const orderedMoves = orderMoves(board, moves);
  const nextSide = side === SIDE_BLACK ? SIDE_RED : SIDE_BLACK;

  if (maximizing) {
    let maxEval = -Infinity;
    for (const mv of orderedMoves) {
      const captured = applyMove(board, mv);
      const evalScore = minimax(board, depth - 1, alpha, beta, false, nextSide);
      undoMove(board, mv, captured);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // αβ剪枝
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const mv of orderedMoves) {
      const captured = applyMove(board, mv);
      const evalScore = minimax(board, depth - 1, alpha, beta, true, nextSide);
      undoMove(board, mv, captured);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // αβ剪枝
    }
    return minEval;
  }
}

/**
 * AI黑方走棋：Minimax + αβ剪枝，深度3层
 */
export function selectAiMove(board: (Piece | null)[][]): Move | null {
  const moves = legalMoves(board, SIDE_BLACK);
  if (!moves.length) return null;

  const orderedMoves = orderMoves(board, moves);
  let bestMove: Move | null = null;
  let bestScore = -Infinity;

  for (const mv of orderedMoves) {
    const simBoard = cloneBoard(board);
    applyMove(simBoard, mv);
    // 玩家(红方)接下来走，所以是minimizing
    const score = minimax(simBoard, SEARCH_DEPTH - 1, -Infinity, Infinity, false, SIDE_RED);
    // 加微小随机，避免完全相同局面每次走一样
    const finalScore = score + Math.random() * 2;
    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMove = mv;
    }
  }

  return bestMove;
}
