// src/games/checkers/Rules.ts

export type Player = 'red' | 'blue';
export type PieceType = Player | null;
export interface Position { r: number; c: number; }
export type BoardState = PieceType[][];

const BOARD_SIZE = 11;

// 1. 坐标校验 (原版：完整六角星几何逻辑)
export const isValidPos = (r: number, c: number): boolean => {
  if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
  
  // 顶部三角形 (0-3行) - 蓝方大本营
  if (r < 4) {
    if (c < 5 - r || c > 5 + r) return false;
  }
  // 中间矩形带 (4-6行)
  else if (r < 7) {
    if (c < 2 || c > 8) return false;
  }
  // 底部倒三角形 (7-10行) - 红方大本营
  else {
    const distFromBottom = 10 - r; // 0, 1, 2, 3
    if (c < 5 - distFromBottom || c > 5 + distFromBottom) return false;
  }
  return true;
};

export const initBoard = (): BoardState => {
  const board: BoardState = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

  const positions: { r: number; c: number; side: Player }[] = [
    // 蓝方：1 + 3 + 5 = 9
    { r: 0, c: 5, side: 'blue' },
    { r: 1, c: 4, side: 'blue' },
    { r: 1, c: 5, side: 'blue' },
    { r: 1, c: 6, side: 'blue' },
    { r: 2, c: 3, side: 'blue' },
    { r: 2, c: 4, side: 'blue' },
    { r: 2, c: 5, side: 'blue' },
    { r: 2, c: 6, side: 'blue' },
    { r: 2, c: 7, side: 'blue' },

    // 红方：1 + 3 + 5 = 9，上下镜像
    { r: 10, c: 5, side: 'red' },
    { r: 9, c: 4, side: 'red' },
    { r: 9, c: 5, side: 'red' },
    { r: 9, c: 6, side: 'red' },
    { r: 8, c: 3, side: 'red' },
    { r: 8, c: 4, side: 'red' },
    { r: 8, c: 5, side: 'red' },
    { r: 8, c: 6, side: 'red' },
    { r: 8, c: 7, side: 'red' },
  ];

  for (const p of positions) {
    if (isValidPos(p.r, p.c)) {
      board[p.r][p.c] = p.side;
    }
  }

  return board;
};

// 3. 获取合法移动 (原版：支持平移和跳跃)
export const getValidMoves = (board: BoardState, pos: Position): Position[] => {
  const moves: Position[] = [];
  const directions = [
    [-1, -1], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 1]
  ];

  directions.forEach(([dr, dc]) => {
    // 单步移动
    const nr = pos.r + dr;
    const nc = pos.c + dc;
    if (isValidPos(nr, nc) && board[nr][nc] === null) {
      moves.push({ r: nr, c: nc });
    }

    // 跳跃移动 (吃子逻辑简化为跳过)
    const jr = pos.r + dr * 2;
    const jc = pos.c + dc * 2;
    if (isValidPos(jr, jc) && board[jr][jc] === null) {
      const midR = pos.r + dr;
      const midC = pos.c + dc;
      if (isValidPos(midR, midC) && board[midR][midC] !== null && board[midR][midC] !== board[pos.r][pos.c]) {
        moves.push({ r: jr, c: jc });
      }
    }
  });
  return moves;
};

// 4. 胜负判定 (原版：吃光对方即获胜)
export const checkWin = (board: BoardState): Player | null => {
  let redCount = 0, blueCount = 0;
  board.forEach(row => row.forEach(cell => {
    if (cell === 'red') redCount++;
    if (cell === 'blue') blueCount++;
  }));
  if (redCount === 0) return 'blue';
  if (blueCount === 0) return 'red';
  return null;
};