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
  const board: BoardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!isValidPos(r, c)) continue;

      // 蓝方在上方 (r: 0-3)，只放 9 个
      if (r < 4) {
        // 只保留特定位置的棋子，减少 7 个
        if (
          (r === 0 && c === 5) ||                     // 顶点
          (r === 1 && (c === 4 || c === 6)) ||        // 第二行中间两个
          (r === 2 && (c === 3 || c === 5 || c === 7)) || // 第三行中间三个
          (r === 3 && (c === 2 || c === 4 || c === 6 || c === 8)) // 第四行四个
        ) {
          board[r][c] = 'blue';
        }
      }
      // 红方在下方 (r: 7-10)，对称放置 9 个
      else if (r > 6) {
        if (
          (r === 10 && c === 5) ||                    // 顶点
          (r === 9 && (c === 4 || c === 6)) ||        // 倒数第二行中间两个
          (r === 8 && (c === 3 || c === 5 || c === 7)) || // 倒数第三行中间三个
          (r === 7 && (c === 2 || c === 4 || c === 6 || c === 8)) // 倒数第四行四个
        ) {
          board[r][c] = 'red';
        }
      }
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