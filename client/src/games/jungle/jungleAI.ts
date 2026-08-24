import type { Board, Pos } from './jungleTypes';
import { Animal, Side, ANIMAL_STRENGTH } from './jungleTypes';
import { getValidMoves, isSideDefeated } from './jungleRules';

export type AIDifficulty = 'easy' | 'medium' | 'hard';
type Move = { from: Pos; to: Pos };

// 认输标记走法
export const RESIGN_MOVE: Move = { from: { row: -1, col: -1 }, to: { row: -1, col: -1 } };

const DEN_RED: Pos = { row: 0, col: 3 };
const DEN_BLUE: Pos = { row: 8, col: 3 };

let MAX_SEARCH_DEPTH = 3;
const TIME_LIMIT_MS = 1500;
let searchStartTime: number;

/** 工具：判断当前棋盘，side的对手是否拥有一步杀（可以直接走入side的兽穴） */
function hasOpponentInstantWin(board: Board, side: Side): boolean {
  const opp = opponentOf(side);
  const myDen = myDenOf(side);
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const piece = board[r][c];
      if (piece && piece.side === opp) {
        const targets = getValidMoves(board, { row: r, col: c }, opp);
        for (const t of targets) {
          if (t.row === myDen.row && t.col === myDen.col) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

export function getAIMove(board: Board, side: Side, difficulty: AIDifficulty = 'medium'): Move | null {
  searchStartTime = Date.now();
  const moves = collectMoves(board, side);
  if (moves.length === 0) return null;

  // 第一层预判：当前对手已经一步杀，直接认输
  if (hasOpponentInstantWin(board, side)) {
    return RESIGN_MOVE;
  }

  // 第二层预判：任意走一步之后对手立刻一步杀，则认输（浅层，easy/medium/hard共用）
  let everyMoveLeadsToEnemyWin = true;
  for (const mv of moves) {
    const simBoard = applyMove(board, mv);
    if (!hasOpponentInstantWin(simBoard, side)) {
      everyMoveLeadsToEnemyWin = false;
      break;
    }
  }
  if (everyMoveLeadsToEnemyWin) {
    return RESIGN_MOVE;
  }

  switch (difficulty) {
    case 'easy':
      MAX_SEARCH_DEPTH = 1;
      return getEasyMove(board, moves);
    case 'hard':
      MAX_SEARCH_DEPTH = 3;
      return getHardMove(board, side, moves);
    case 'medium':
    default:
      MAX_SEARCH_DEPTH = 2;
      return getMediumMove(board, side, moves);
  }
}

function collectMoves(board: Board, side: Side): Move[] {
  const out: Move[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const p = board[r][c];
      if (p && p.side === side) {
        for (const to of getValidMoves(board, { row: r, col: c }, side)) {
          out.push({ from: { row: r, col: c }, to });
        }
      }
    }
  }
  return out;
}

function applyMove(board: Board, m: Move): Board {
  const nb: Board = board.map(row => row.slice());
  nb[m.to.row][m.to.col] = nb[m.from.row][m.from.col];
  nb[m.from.row][m.from.col] = null;
  return nb;
}

function opponentOf(side: Side): Side {
  return side === Side.RED ? Side.BLUE : Side.RED;
}

function denOf(side: Side): Pos {
  return side === Side.RED ? DEN_BLUE : DEN_RED;
}

function myDenOf(side: Side): Pos {
  return side === Side.RED ? DEN_RED : DEN_BLUE;
}

// 简单模式：保留原有简易随机AI
function getEasyMove(board: Board, moves: Move[]): Move {
  const eats = moves.filter(m => board[m.to.row][m.to.col] !== null);
  if (eats.length > 0 && Math.random() < 0.85) {
    return eats[Math.floor(Math.random() * eats.length)];
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

// 中等模式：贪心策略，增加进攻/防守打分，无深度搜索，仅看一步
function getMediumMove(board: Board, side: Side, moves: Move[]): Move {
  const opp = opponentOf(side);
  const myDen = myDenOf(side);
  const oppDen = denOf(side);
  const checkTimeout = () => Date.now() - searchStartTime > TIME_LIMIT_MS;

  type ScoredMove = { move: Move; score: number };
  const scored: ScoredMove[] = [];

  for (const mv of moves) {
    if (checkTimeout()) break;
    const nextBoard = applyMove(board, mv);
    let score = 0;

    // 进攻奖励：走完直接获胜
    if (isSideDefeated(nextBoard, opp)) {
      score += 5000;
    }
    // 防守惩罚：走完送给对手一步杀
    if (hasOpponentInstantWin(nextBoard, side)) {
      score -= 4500;
    }
    scored.push({ move: mv, score });
  }

  // 战术分降序排序
  scored.sort((a, b) => b.score - a.score);
  const priorityMoves = scored.map(x => x.move);

  const winMoves = priorityMoves.filter(mv => {
    if (checkTimeout()) return false;
    const nextBoard = applyMove(board, mv);
    return isSideDefeated(nextBoard, opp);
  });
  if (winMoves.length > 0) return winMoves[0];

  const dangerousOppMoves: Pos[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (checkTimeout()) break;
      const piece = board[r][c];
      if (piece && piece.side === opp) {
        const valid = getValidMoves(board, { row: r, col: c }, opp);
        for (const target of valid) {
          if (target.row === myDen.row && target.col === myDen.col) {
            dangerousOppMoves.push({ row: r, col: c });
          }
        }
      }
    }
  }

  if (dangerousOppMoves.length > 0) {
    const blockMoves = priorityMoves.filter(mv => {
      if (checkTimeout()) return false;
      const t = board[mv.to.row][mv.to.col];
      if (t && t.side === opp) {
        return dangerousOppMoves.some(d => d.row === mv.to.row && d.col === mv.to.col);
      }
      return false;
    });
    if (blockMoves.length > 0) return blockMoves[0];
  }

  const captureMoves = priorityMoves.filter(mv => board[mv.to.row][mv.to.col] !== null);
  const profitableCaptures: Move[] = [];
  for (const mv of captureMoves) {
    if (checkTimeout()) break;
    const nextBoard = applyMove(board, mv);
    const oppNextMoves = collectMoves(nextBoard, opp);
    const willBeEaten = oppNextMoves.some(om =>
      om.to.row === mv.to.row && om.to.col === mv.to.col
    );
    if (!willBeEaten) {
      profitableCaptures.push(mv);
    }
  }
  if (profitableCaptures.length > 0) {
    profitableCaptures.sort((a, b) => {
      const valA = ANIMAL_STRENGTH[board[a.to.row][a.to.col]!.animal];
      const valB = ANIMAL_STRENGTH[board[b.to.row][b.to.col]!.animal];
      return valB - valA;
    });
    return profitableCaptures[0];
  }

  let bestMove = priorityMoves[0];
  let minDist = 999;
  for (const mv of priorityMoves) {
    if (checkTimeout()) break;
    const dist = Math.abs(mv.to.row - oppDen.row) + Math.abs(mv.to.col - oppDen.col);
    if (dist < minDist) {
      minDist = dist;
      bestMove = mv;
    }
  }
  return bestMove;
}

// 困难模式：alpha‑beta剪枝，支持识别两步/多步必败局面，直接认输
function getHardMove(board: Board, side: Side, moves: Move[]): Move {
  const opp = opponentOf(side);
  const myDen = myDenOf(side);
  const checkTimeout = () => Date.now() - searchStartTime > TIME_LIMIT_MS;

  for (const mv of moves) {
    if (checkTimeout()) break;
    if (isSideDefeated(applyMove(board, mv), opp)) return mv;
  }

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (checkTimeout()) break;
      const p = board[r][c];
      if (p && p.side === opp) {
        const targets = getValidMoves(board, { row: r, col: c }, opp);
        for (const t of targets) {
          if (t.row === myDen.row && t.col === myDen.col) {
            for (const mv of moves) {
              if (mv.to.row === r && mv.to.col === c) return mv;
              const dist = Math.abs(mv.to.row - myDen.row) + Math.abs(mv.to.col - myDen.col);
              if (dist === 1 && board[mv.to.row][mv.to.col] === null) return mv;
            }
            return RESIGN_MOVE;
          }
        }
      }
    }
  }

  let minOppDist = 99;
  let threatPos: Pos | null = null;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (checkTimeout()) break;
      const p = board[r][c];
      if (p && p.side === opp) {
        const dist = Math.abs(r - myDen.row) + Math.abs(c - myDen.col);
        if (dist < minOppDist) {
          minOppDist = dist;
          threatPos = { row: r, col: c };
        }
      }
    }
  }

  if (minOppDist <= 2 && threatPos) {
    let bestDefense: Move = moves[0];
    let bestScore = -Infinity;
    for (const mv of moves) {
      if (checkTimeout()) break;
      let score = 0;
      const target = board[mv.to.row][mv.to.col];
      if (target && target.side === opp) {
        score += 900;
      }
      const toDist = Math.abs(mv.to.row - myDen.row) + Math.abs(mv.to.col - myDen.col);
      score += (14 - toDist) * 75;
      if (score > bestScore) {
        bestScore = score;
        bestDefense = mv;
      }
    }
    return bestDefense;
  }

  const sortedMoves = moves.slice().sort((a, b) => {
    return evaluateBoard(applyMove(board, b), side) - evaluateBoard(applyMove(board, a), side);
  });
  let best = sortedMoves[0];
  let bestScore = -Infinity;
  const scoreList: Array<{ mv: Move; score: number }> = [];

  for (const mv of sortedMoves) {
    if (checkTimeout()) break;
    const nb = applyMove(board, mv);
    if (isSideDefeated(nb, opp)) return mv;
    const score = alphaBeta(nb, side, 1, MAX_SEARCH_DEPTH - 1, -Infinity, Infinity, false);
    scoreList.push({ mv, score });
    if (score > bestScore) {
      bestScore = score;
      best = mv;
    }
  }

  // 困难模式：识别两步/多步必败，全部分支都走向失败，直接认输
  const allBranchesAreLost = scoreList.every(item => item.score < -300000);
  if (allBranchesAreLost) {
    return RESIGN_MOVE;
  }

  return best;
}

function alphaBeta(
  board: Board,
  side: Side,
  currentDepth: number,
  maxDepth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (Date.now() - searchStartTime > TIME_LIMIT_MS) {
    return evaluateBoard(board, side);
  }
  const opp = opponentOf(side);
  if (isSideDefeated(board, opp)) return 325000 + currentDepth;
  if (isSideDefeated(board, side)) return -325000 - currentDepth;
  if (currentDepth >= maxDepth) {
    return evaluateBoard(board, side);
  }
  const currentSide = isMaximizing ? side : opp;
  const moves = collectMoves(board, currentSide);
  if (moves.length === 0) return evaluateBoard(board, side);
  const sortedMoves = moves.slice().sort((a, b) => {
    return evaluateBoard(applyMove(board, b), side) - evaluateBoard(applyMove(board, a), side);
  });
  if (isMaximizing) {
    let value = -Infinity;
    for (const mv of sortedMoves) {
      if (Date.now() - searchStartTime > TIME_LIMIT_MS) break;
      const nb = applyMove(board, mv);
      value = Math.max(value, alphaBeta(nb, side, currentDepth + 1, maxDepth, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const mv of sortedMoves) {
      if (Date.now() - searchStartTime > TIME_LIMIT_MS) break;
      const nb = applyMove(board, mv);
      value = Math.min(value, alphaBeta(nb, side, currentDepth + 1, maxDepth, alpha, beta, true));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function evaluateBoard(board: Board, side: Side): number {
  const myDen = myDenOf(side);
  const oppDen = denOf(side);
  const opp = opponentOf(side);
  let score = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = ANIMAL_STRENGTH[p.animal];
      const river = r >= 3 && r <= 5 && (c === 1 || c === 2 || c === 4 || c === 5);
      const inOppDen = (side === Side.RED && r === 8 && c === 3) || (side === Side.BLUE && r === 0 && c === 3);
      if (p.side === side) {
        if (inOppDen) {
          score += 325000;
        } else {
          score += val * 185;
          score += (14 - (Math.abs(r - oppDen.row) + Math.abs(c - oppDen.col))) * 168;
          if ((side === Side.RED && r >= 4) || (side === Side.BLUE && r <= 4)) score += 240;
          if (p.animal === Animal.RAT && river) score += 195;
          if ((p.animal === Animal.LION || p.animal === Animal.TIGER) && river) score += 215;
          if (hasAllyNearby(board, r, c, side)) score += 196;
        }
      } else {
        const inMyDen = (side === Side.RED && r === 0 && c === 3) || (side === Side.BLUE && r === 8 && c === 3);
        if (inMyDen) {
          score -= 340000;
        } else {
          score -= val * 192;
          const d = Math.abs(r - myDen.row) + Math.abs(c - myDen.col);
          if (d <= 3) score -= val * 158;
          if (p.animal === Animal.RAT && river) score -= 172;
          if (!hasAllyNearby(board, r, c, opp)) score -= val * 164;
        }
      }
    }
  }
  return score;
}

function hasAllyNearby(board: Board, r: number, c: number, side: Side): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
        const p = board[nr][nc];
        if (p && p.side === side) return true;
      }
    }
  }
  return false;
}
