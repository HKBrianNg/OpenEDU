// client/src/games/checker/board.ts
import type { Board, Player, Point, Piece, GameState } from './types';

const BOARD_SIZE = 17;

// 1. 初始化棋盘：生成标准的六角星布局
export const initBoard = (): Board => {
  const board: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  // 辅助函数：判断某个点是否在六角星范围内
  const isInStar = (r: number, c: number): boolean => {
    // 这里的数学逻辑定义了波子棋的星形边界
    const center = 8;
    const dist = Math.abs(r - center) + Math.abs(c - center);
    return dist <= 8 && (r + c) % 2 === 0; // 简化版判定，实际需根据具体网格调整
  };

  // 填充红方（下方）和蓝方（上方）
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!isInStar(r, c)) continue;
      
      // 蓝方大本营 (上方三角形区域)
      if (r <= 3 && c >= (8 - r) && c <= (8 + r)) {
        board[r][c] = { player: 'blue' };
      }
      // 红方大本营 (下方三角形区域)
      else if (r >= 13 && c >= (r - 8) && c <= (24 - r)) {
        board[r][c] = { player: 'red' };
      }
    }
  }
  return board;
};

// 2. 获取合法移动（平移 + 连跳）
export const getValidMoves = (board: Board, p: Point): Point[] => {
  const moves: Point[] = [];
  const piece = board[p.r][p.c];
  if (!piece) return moves;

  // 方向向量 (6个方向)
  const dirs = [[-1, -1], [-1, 1], [0, -2], [0, 2], [1, -1], [1, 1]]; 

  // A. 检查平移 (相邻空位)
  dirs.forEach(([dr, dc]) => {
    const nr = p.r + dr, nc = p.c + dc;
    if (isValidPos(nr, nc) && !board[nr][nc]) {
      moves.push({ r: nr, c: nc });
    }
  });

  // B. 检查跳跃 (隔子跳)
  // 注意：这里简化了连跳逻辑，实际游戏中需要递归查找所有可达点
  checkJumps(board, p, new Set(), moves);

  return moves;
};

// 递归查找所有跳跃点
const checkJumps = (board: Board, curr: Point, visited: Set<string>, moves: Point[]) => {
  const dirs = [[-2, -2], [-2, 2], [0, -4], [0, 4], [2, -2], [2, 2]]; // 跳跃步长是平移的两倍
  
  dirs.forEach(([dr, dc]) => {
    const midR = curr.r + dr / 2, midC = curr.c + dc / 2;
    const targetR = curr.r + dr, targetC = curr.c + dc;

    // 中间有子，且目标点为空，且未访问过
    if (isValidPos(midR, midC) && isValidPos(targetR, targetC) && 
        board[midR][midC] && !board[targetR][targetC]) {
      
      const key = `${targetR},${targetC}`;
      if (!visited.has(key)) {
        visited.add(key);
        moves.push({ r: targetR, c: targetC });
        // 继续从新位置寻找连跳
        checkJumps(board, { r: targetR, c: targetC }, visited, moves);
      }
    }
  });
};

const isValidPos = (r: number, c: number) => r >= 0 && r < 17 && c >= 0 && c < 17;

// 3. 执行移动并返回新棋盘
export const makeMove = (board: Board, from: Point, to: Point): Board => {
  const newBoard = board.map(row => [...row]);
  newBoard[to.r][to.c] = newBoard[from.r][from.c];
  newBoard[from.r][from.c] = null;
  return newBoard;
};