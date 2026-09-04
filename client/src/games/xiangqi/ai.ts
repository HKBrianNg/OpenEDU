// ai.ts
import type { Move, Piece, Side } from './types';
import { legalMoves } from './rules';
import { VAL } from './board';

/**
 * 复制棋盘，模拟推演使用，不再直接改动原始棋盘
 */
function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map(row => [...row]);
}

// 字面量常量，统一使用
const SIDE_RED: Side = 'r';
const SIDE_BLACK: Side = 'b';

/**
 * 动态计算子力价值：过河兵升值；残局调整马炮权重
 */
function getDynamicValue(piece: Piece, row: number, board: (Piece | null)[][]): number {
  let base = VAL[piece.type];
  const totalPieces = board.flat().filter(x => x !== null).length;
  const isEndGame = totalPieces <= 12;

  if (piece.type === 'P') {
    // 红方兵 行号 <=4代表过河；黑方卒行号 >=5代表过河
    const crossRiver = piece.side === SIDE_RED ? row <= 4 : row >= 5;
    if (crossRiver) {
      base += 60;
    }
  }

  if (isEndGame) {
    // 残局炮价值下降，马价值上升
    if (piece.type === 'C') base *= 0.75;
    if (piece.type === 'N') base *= 1.25;
  }
  return base;
}

/**
 * 位置加分：棋子站的点位好坏，传入行列下标
 */
function getPositionScore(piece: Piece, row: number, col: number): number {
  let score = 0;

  // 中路优先，col=4
  if (col === 4) score += 12;

  if (piece.type === 'R') {
    // 车占肋道
    if (col === 3 || col === 5) score += 15;
  }
  if (piece.type === 'N') {
    // 马跳腹地加分，边角扣分
    if ((row >= 2 && row <= 7) && (col >= 2 && col <= 6)) score += 18;
    if ((row <= 1 || row >= 8) || (col <= 1 || col >= 7)) score -= 12;
  }
  if (piece.type === 'P') {
    // 过河兵靠近对方九宫加分
    if (piece.side === SIDE_RED && row <= 2) score += 20;
    if (piece.side === SIDE_BLACK && row >= 7) score += 20;
  }

  return score;
}

/** AI黑方走棋，单层增强贪心 */
export function selectAiMove(board: (Piece | null)[][]): Move | null {
  const moves = legalMoves(board, SIDE_BLACK);
  if (!moves.length) return null;

  let bestMove: Move | null = null;
  let bestScore = -Infinity;

  for (const mv of moves) {
    // 使用副本推演，不污染原棋盘
    const simBoard = cloneBoard(board);
    const piece = simBoard[mv.fr][mv.fc];
    if (!piece) continue;

    const captured = simBoard[mv.tr][mv.tc];
    // 执行走子
    simBoard[mv.tr][mv.tc] = piece;
    simBoard[mv.fr][mv.fc] = null;

    let score = Math.random() * 4; // 微小随机，避免AI每局完全一模一样

    // 1.吃子收益，动态价值
    if (captured) {
      score += getDynamicValue(captured, mv.tr, simBoard);
    }

    // 2.位置分，棋子走到新位置(mv.tr,mv.tc)的点位收益
    score += getPositionScore(piece, mv.tr, mv.tc);

    // 3.检查我方全部棋子是否暴露在对方攻击下
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = simBoard[r][c];
        if (p && p.side === SIDE_BLACK) {
          // 是否被红方任意棋子攻击
          const attacked = legalMoves(simBoard, SIDE_RED).some(m => m.tr === r && m.tc === c);
          if (attacked) {
            // 被攻击扣对应棋子动态价值
            score -= getDynamicValue(p, r, simBoard) * 0.45;
          }
        }
      }
    }

    // 4.将军加分
    const isCheck = legalMoves(simBoard, SIDE_RED).some(m => {
      const target = simBoard[m.tr][m.tc];
      return target && target.type === 'K' && target.side === SIDE_RED;
    });
    if (isCheck) {
      score += 70;
    }

    // 5.杀棋（对方无合法走法）极高奖励
    const redMoves = legalMoves(simBoard, SIDE_RED);
    if (redMoves.length === 0) {
      score += 10000;
    }

    // 6.兑子简单约束：不要用大子换对方弱子
    if (captured) {
      const capVal = getDynamicValue(captured, mv.tr, simBoard);
      const selfVal = getDynamicValue(piece, mv.fr, simBoard);
      if (selfVal > capVal * 1.4) {
        score -= selfVal * 0.35;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = mv;
    }
  }

  return bestMove;
}
