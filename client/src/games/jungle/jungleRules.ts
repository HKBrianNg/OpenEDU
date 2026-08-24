// client/src/games/jungle/jungleRules.ts

import type { Board, Pos } from './jungleTypes';
import { Animal, Side, ANIMAL_STRENGTH } from './jungleTypes';

// 导出类型供其他文件使用
export type { Board, Pos } from './jungleTypes';
export { Side, GameStatus } from './jungleTypes';

// 棋盘尺寸
export const ROWS = 9;
export const COLS = 7;

// 河流区域
const RIVER_CELLS = new Set([
  '3,1', '3,2', '4,1', '4,2', '5,1', '5,2',
  '3,4', '3,5', '4,4', '4,5', '5,4', '5,5',
]);

// 陷阱
const TRAPS_RED = new Set(['0,2', '0,4', '1,3']);
const TRAPS_BLUE = new Set(['8,2', '8,4', '7,3']);

// 兽穴
const DEN_RED: Pos = { row: 0, col: 3 };
const DEN_BLUE: Pos = { row: 8, col: 3 };

const isRiver = (row: number, col: number) => RIVER_CELLS.has(`${row},${col}`);

const isTrap = (row: number, col: number, side: Side) => {
  const traps = side === Side.RED ? TRAPS_RED : TRAPS_BLUE;
  return traps.has(`${row},${col}`);
};

const isDen = (row: number, col: number, side: Side) => {
  const den = side === Side.RED ? DEN_RED : DEN_BLUE;
  return den.row === row && den.col === col;
};

// 获取某个格子的合法移动目标
export function getValidMoves(board: Board, pos: Pos, side: Side): Pos[] {
  const piece = board[pos.row][pos.col];
  if (!piece || piece.side !== side) return [];

  const moves: Pos[] = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dr, dc] of directions) {
    const nr = pos.row + dr;
    const nc = pos.col + dc;

    // 边界检查
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;

    // 不能进入己方兽穴
    if (isDen(nr, nc, side)) continue;

    // 河流检查
    if (isRiver(nr, nc)) {
      // 只有老鼠能进河
      if (piece.animal !== Animal.RAT) continue;
    }

    // 目标格有己方棋子
    const target = board[nr][nc];
    if (target && target.side === side) continue;

    // 目标格有敌方棋子 → 判断是否能吃
    if (target && target.side !== side) {
      if (canCapture(piece.animal, target.animal, nr, nc, side)) {
        moves.push({ row: nr, col: nc });
      }
      continue;
    }

    // 空位
    moves.push({ row: nr, col: nc });
  }

  return moves;
}

// 判断能否吃子
function canCapture(attacker: Animal, defender: Animal, defRow: number, defCol: number, attackerSide: Side): boolean {
  // 老鼠吃象
  if (attacker === Animal.RAT && defender === Animal.ELEPHANT) return true;
  // 象不能吃老鼠
  if (attacker === Animal.ELEPHANT && defender === Animal.RAT) return false;
  // 在陷阱里的敌方棋子，任意己方棋子都能吃
  if (isTrap(defRow, defCol, attackerSide === Side.RED ? Side.BLUE : Side.RED)) return true;
  // 正常情况下，强者吃弱者，同级互吃（主动方赢）
  return ANIMAL_STRENGTH[attacker] >= ANIMAL_STRENGTH[defender];
}

/**
 * 检查指定一方是否已经输掉比赛（被对方攻入兽穴或棋子全灭）。
 *
 * ⚠️ 调用约定：
 *   - 若 `isSideDefeated(board, currentPlayer)` 为 true，表示当前玩家输了。
 *   - 若 `isSideDefeated(board, opponent)` 为 true，表示对手输了，当前玩家赢了。
 *
 * @param board 当前棋盘
 * @param side  要检查的一方
 * @returns true 表示该方已经失败
 */
export function isSideDefeated(board: Board, side: Side): boolean {
  // 条件1：对方的棋子进入了 mySide 的兽穴
  const myDen = side === Side.RED ? DEN_RED : DEN_BLUE;
  const pieceInDen = board[myDen.row][myDen.col];
  if (pieceInDen && pieceInDen.side !== side) {
    return true;
  }

  // 条件2：该方已经没有棋子存活
  const hasAlivePiece = board.some(row =>
    row.some(cell => cell !== null && cell.side === side)
  );
  return !hasAlivePiece;
}

/**
 * 兼容旧接口：判断 side 是否获胜（注意语义与 isSideDefeated 相反）。
 * 推荐新代码使用 isSideDefeated，避免混淆。
 *
 * @deprecated 请使用 isSideDefeated 替代
 */
export function checkWin(board: Board, side: Side): boolean {
  // 如果对手失败了，则 side 获胜
  const opponent = side === Side.RED ? Side.BLUE : Side.RED;
  return isSideDefeated(board, opponent);
}

// 初始化棋盘
export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  const redPieces: [number, number, Animal][] = [
    [0, 0, Animal.LION], [0, 6, Animal.TIGER],
    [1, 1, Animal.DOG], [1, 5, Animal.CAT],
    [2, 0, Animal.RAT], [2, 2, Animal.LEOPARD], [2, 4, Animal.WOLF], [2, 6, Animal.ELEPHANT],
  ];

  const bluePieces: [number, number, Animal][] = [
    [8, 0, Animal.LION], [8, 6, Animal.TIGER],
    [7, 1, Animal.DOG], [7, 5, Animal.CAT],
    [6, 0, Animal.RAT], [6, 2, Animal.LEOPARD], [6, 4, Animal.WOLF], [6, 6, Animal.ELEPHANT],
  ];

  for (const [row, col, animal] of redPieces) {
    board[row][col] = { animal, side: Side.RED, id: `red-${animal}-${row}-${col}` };
  }
  for (const [row, col, animal] of bluePieces) {
    board[row][col] = { animal, side: Side.BLUE, id: `blue-${animal}-${row}-${col}` };
  }

  return board;
}