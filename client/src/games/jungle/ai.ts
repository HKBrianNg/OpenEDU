import type { JunglePiece, CellType } from './types';
import { PIECE_SCORE } from './types';

import { clonePieces, getAllMoves, getPieceAt } from './board';

export function evaluate(pieces: JunglePiece[], cellType: CellType[][]): number {
  let score = 0;
  const redElephant = pieces.find(p => p.side === 'red' && p.animal === 'elephant');
  for (const p of pieces) {
    let s = PIECE_SCORE[p.animal];
    if (cellType[p.y][p.x] === 'trap') {
      s *= 0.25;
    }
    if (p.animal === 'mouse' && p.inRiver) {
      s += 18;
    }

    if (p.side === 'blue') {
      const distToDen = Math.abs(p.x - 3) + Math.abs(p.y - 0);
      s += (18 - distToDen) * 2.5;
      if (p.animal === 'mouse' && redElephant) {
        const d = Math.abs(p.x - redElephant.x) + Math.abs(p.y - redElephant.y);
        s += Math.max(0, 22 - d) * 2;
      }
      score += s;
    } else {
      const distToDen = Math.abs(p.x - 3) + Math.abs(p.y - 8);
      s += (18 - distToDen) * 2.5;
      score -= s;
    }
  }
  return score;
}

export function minimax(
  pieces: JunglePiece[],
  depth: number,
  alpha: number,
  beta: number,
  isAiTurn: boolean,
  cellType: CellType[][]
): number {
  const blueDen = getPieceAt(pieces, 3, 0);
  const redDen = getPieceAt(pieces, 3, 8);
  if (blueDen && blueDen.side === 'blue') return 9999;
  if (redDen && redDen.side === 'red') return -9999;
  if (depth <= 0) {
    return evaluate(pieces, cellType);
  }

  if (isAiTurn) {
    let maxVal = -Infinity;
    const moves = getAllMoves(pieces, 'blue', cellType);
    for (const mv of moves) {
      const sim = clonePieces(pieces);
      const simPiece = sim.find(pp => pp.x === mv.piece.x && pp.y === mv.piece.y)!;
      const idx = sim.findIndex(pp => pp.x === mv.toX && pp.y === mv.toY);
      if (idx !== -1) sim.splice(idx, 1);
      simPiece.x = mv.toX;
      simPiece.y = mv.toY;
      simPiece.inRiver = cellType[mv.toY][mv.toX] === 'river';

      const val = minimax(sim, depth - 1, alpha, beta, false, cellType);
      maxVal = Math.max(maxVal, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return maxVal;
  } else {
    let minVal = Infinity;
    const moves = getAllMoves(pieces, 'red', cellType);
    for (const mv of moves) {
      const sim = clonePieces(pieces);
      const simPiece = sim.find(pp => pp.x === mv.piece.x && pp.y === mv.piece.y)!;
      const idx = sim.findIndex(pp => pp.x === mv.toX && pp.y === mv.toY);
      if (idx !== -1) sim.splice(idx, 1);
      simPiece.x = mv.toX;
      simPiece.y = mv.toY;
      simPiece.inRiver = cellType[mv.toY][mv.toX] === 'river';

      const val = minimax(sim, depth - 1, alpha, beta, true, cellType);
      minVal = Math.min(minVal, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return minVal;
  }
}

export function searchBestMove(pieces: JunglePiece[], cellType: CellType[][], searchDepth = 2) {
  const allMoves = getAllMoves(pieces, 'blue', cellType);
  if (allMoves.length === 0) return null;
  let bestMove = allMoves[0];
  let bestScore = -Infinity;

  for (const mv of allMoves) {
    const sim = clonePieces(pieces);
    const simPiece = sim.find(pp => pp.x === mv.piece.x && pp.y === mv.piece.y)!;
    const idx = sim.findIndex(pp => pp.x === mv.toX && pp.y === mv.toY);
    if (idx !== -1) sim.splice(idx, 1);
    simPiece.x = mv.toX;
    simPiece.y = mv.toY;
    simPiece.inRiver = cellType[mv.toY][mv.toX] === 'river';

    const score = minimax(sim, searchDepth - 1, -Infinity, Infinity, false, cellType);
    if (score > bestScore) {
      bestScore = score;
      bestMove = mv;
    }
  }
  return bestMove;
}
