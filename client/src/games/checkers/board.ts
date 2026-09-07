// client/src/games/checker/board.ts
import type { Board, Point } from './types';

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