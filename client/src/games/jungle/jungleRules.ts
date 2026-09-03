// client/src/games/jungle/jungleRules.ts
import type { Board, Pos } from './jungleTypes';
import { Animal, Side, ANIMAL_STRENGTH } from './jungleTypes';
// 导出类型供其他文件使用
export type { Board, Pos } from './jungleTypes';
export { Side } from './jungleTypes';

// 棋盘尺寸
export const ROWS = 9;
export const COLS = 7;

// 河流区域，和后端 is_river(r,c) 完全一致
const RIVER_CELLS = new Set([
  '3,1', '3,2', '4,1', '4,2', '5,1', '5,2',
  '3,4', '3,5', '4,4', '4,5', '5,4', '5,5',
]);

// ========== 修复：陷阱坐标，与后端 rules.py 严格对齐 ==========
// TRAPS_RED：红方的陷阱（在红方兽穴上方 row=7，col 2,3,4）
const TRAPS_RED = new Set(['7,2', '7,3', '7,4']);
// TRAPS_BLUE：蓝方的陷阱（在蓝方兽穴下方 row=1，col 2,3,4）
const TRAPS_BLUE = new Set(['1,2', '1,3', '1,4']);

// 兽穴：DEN_RED红方兽穴在下方(8,3)；DEN_BLUE蓝方兽穴在上方(0,3)
const DEN_RED: Pos = { row: 8, col: 3 };
const DEN_BLUE: Pos = { row: 0, col: 3 };

const isRiver = (row: number, col: number) => RIVER_CELLS.has(`${row},${col}`);

/**
 * 判断 (row,col) 是否属于 side 这一方的陷阱
 * 注意：陷阱属于己方，敌方落进来，己方可以任意吃它
 */
const isOwnTrap = (row: number, col: number, side: Side) => {
  const traps = side === Side.RED ? TRAPS_RED : TRAPS_BLUE;
  return traps.has(`${row},${col}`);
};

/** 判断格子是不是任意陷阱（用于UI渲染叉号） */
export function isAnyTrap(row: number, col: number): boolean {
  return TRAPS_RED.has(`${row},${col}`) || TRAPS_BLUE.has(`${row},${col}`);
}

const isDen = (row: number, col: number, side: Side) => {
  const den = side === Side.RED ? DEN_RED : DEN_BLUE;
  return den.row === row && den.col === col;
};

/**
 * 获取某个棋子的合法移动目标（前端仅用于UI高亮；真实走棋以后端返回为准）
 * 修复：狮虎跳河遍历整条河道，河道内有棋子则阻断跳河，和后端逻辑对齐
 */
export function getValidMoves(board: Board, pos: Pos, side: Side): Pos[] {
  const piece = board[pos.row][pos.col];
  if (!piece || piece.side !== side) return [];
  const moves: Pos[] = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // 1.普通四向步
  for (const [dr, dc] of directions) {
    const nr = pos.row + dr;
    const nc = pos.col + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
    if (isDen(nr, nc, side)) continue;

    // 非老鼠禁止走入河水
    if (isRiver(nr, nc)) {
      if (piece.animal === Animal.RAT) {
        if (board[nr][nc] === null) {
          moves.push({ row: nr, col: nc });
        }
      }
      continue;
    }

    const target = board[nr][nc];
    if (target && target.side === side) continue;
    if (target && target.side !== side) {
      if (canCapture(piece.animal, target.animal, nr, nc, side)) {
        moves.push({ row: nr, col: nc });
      }
      continue;
    }
    moves.push({ row: nr, col: nc });
  }

  // 2.狮、虎独立跳河逻辑（遍历整条河道，河里有棋子阻断）
  if (piece.animal === Animal.LION || piece.animal === Animal.TIGER) {
    for (const [dr, dc] of directions) {
      let rJump = pos.row + dr;
      let cJump = pos.col + dc;
      if (rJump < 0 || rJump >= ROWS || cJump < 0 || cJump >= COLS) continue;
      if (!isRiver(rJump, cJump)) continue;

      let blocked = false;
      // 沿着方向穿过整条河
      while (rJump >= 0 && rJump < ROWS && cJump >=0 && cJump < COLS && isRiver(rJump, cJump)) {
        if (board[rJump][cJump] !== null) {
          blocked = true;
          break;
        }
        rJump += dr;
        cJump += dc;
      }
      if (blocked) continue;
      if (rJump <0 || rJump >= ROWS || cJump <0 || cJump >= COLS) continue;
      if (isRiver(rJump, cJump)) continue;
      if (isDen(rJump, cJump, side)) continue;

      const target = board[rJump][cJump];
      if (target && target.side === side) continue;
      if (target && target.side !== side) {
        if (canCapture(piece.animal, target.animal, rJump, cJump, side)) {
          moves.push({ row: rJump, col: cJump });
        }
        continue;
      }
      moves.push({ row: rJump, col: cJump });
    }
  }

  return moves;
}

/**
 * 判断能否吃子，与后端 can_eat 对齐
 * @param attacker 进攻动物
 * @param defender 被吃动物
 * @param defRow 被吃棋子所在坐标
 * @param defCol
 * @param attackerSide 进攻方
 */
function canCapture(
  attacker: Animal,
  defender: Animal,
  defRow: number,
  defCol: number,
  attackerSide: Side
): boolean {
  // 老鼠吃大象
  if (attacker === Animal.RAT && defender === Animal.ELEPHANT) return true;
  // 大象不能吃老鼠
  if (attacker === Animal.ELEPHANT && defender === Animal.RAT) return false;

  // 敌方棋子落在我方陷阱：我方任意棋子可吃
  if (isOwnTrap(defRow, defCol, attackerSide)) {
    return true;
  }

  // 老鼠只能吃象、陷阱内棋子，不能吃其他
  if (attacker === Animal.RAT) return false;

  return ANIMAL_STRENGTH[attacker] >= ANIMAL_STRENGTH[defender];
}

/**
 * 检查 side 是否被击败：和后端 is_side_defeated 保持一致
 * 仅判定：对方棋子进入己方兽穴即失败；移除前端额外的“棋子全灭失败”（后端无此规则）
 */
export function isSideDefeated(board: Board, side: Side): boolean {
  const myDen = side === Side.RED ? DEN_RED : DEN_BLUE;
  const pieceInDen = board[myDen.row][myDen.col];
  return pieceInDen !== null && pieceInDen.side !== side;
}

/**
 * @deprecated 使用 isSideDefeated
 */
export function checkWin(board: Board, side: Side): boolean {
  const opponent = side === Side.RED ? Side.BLUE : Side.RED;
  return isSideDefeated(board, opponent);
}

/**
 * 初始化棋盘：红蓝阵营位置与后端保持一致
 * RED：红方（蓝方AI）在下；BLUE：蓝方在上
 */
export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  // BLUE 蓝方（上方，side=Side.BLUE）
  const bluePieces: [number, number, Animal][] = [
    [0, 0, Animal.LION], [0, 6, Animal.TIGER],
    [1, 1, Animal.DOG], [1, 5, Animal.CAT],
    [2, 0, Animal.RAT], [2, 2, Animal.LEOPARD], [2, 4, Animal.WOLF], [2, 6, Animal.ELEPHANT],
  ];
  // RED 红方（下方，side=Side.RED）
  const redPieces: [number, number, Animal][] = [
    [8, 0, Animal.LION], [8, 6, Animal.TIGER],
    [7, 1, Animal.DOG], [7, 5, Animal.CAT],
    [6, 0, Animal.RAT], [6, 2, Animal.LEOPARD], [6, 4, Animal.WOLF], [6, 6, Animal.ELEPHANT],
  ];

  for (const [row, col, animal] of bluePieces) {
    board[row][col] = { animal, side: Side.BLUE, id: `blue-${animal}-${row}-${col}` };
  }
  for (const [row, col, animal] of redPieces) {
    board[row][col] = { animal, side: Side.RED, id: `red-${animal}-${row}-${col}` };
  }
  return board;
}
