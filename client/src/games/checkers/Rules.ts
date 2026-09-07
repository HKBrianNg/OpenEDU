// src/games/checkers/Rules.ts

export type Player = 'red' | 'blue';
export type PieceType = Player | null;
export interface Position { r: number; c: number; }
export type BoardState = PieceType[][];

const BOARD_SIZE = 11;

// 1. 坐标校验 (迷你六角星几何逻辑)
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

// 2. 初始化棋盘 (蓝上红下，各9子 - 已按你的要求优化)
export const initBoard = (): BoardState => {
  const board: BoardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!isValidPos(r, c)) continue;

      // 蓝方在上方 (r: 0-2, 共3排9子)
      if (r < 3) board[r][c] = 'blue';
      // 红方在下方 (r: 8-10, 共3排9子)
      else if (r > 7) board[r][c] = 'red';
    }
  }
  return board;
};

// 3. 获取合法移动 (支持平移和跳跃)
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

    // 跳跃移动
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

// 4. 胜负判定 (修复了 ts(6133) 报错 + 增加大本营规则)
export const checkWin = (board: BoardState): Player | null => {
  let redCount = 0, blueCount = 0;
  let redInEnemyBase = 0, blueInEnemyBase = 0;

  // 定义大本营区域
  // 蓝方大本营：r < 3 (顶部3排)
  // 红方大本营：r > 7 (底部3排)

  board.forEach((row, r) => {
    row.forEach((cell, _c) => { // 【修复点】这里把 'c' 改为 '_c'，消除报错
      if (cell === 'red') {
        redCount++;
        if (r < 3) redInEnemyBase++; // 红棋跑到了蓝方家
      }
      if (cell === 'blue') {
        blueCount++;
        if (r > 7) blueInEnemyBase++; // 蓝棋跑到了红方家
      }
    });
  });

  // 胜利条件 A：吃光对方 (简单粗暴)
  if (redCount === 0) return 'blue';
  if (blueCount === 0) return 'red';

  // 胜利条件 B：全员占领对方大本营 (更高级的玩法)
  // 如果红方所有棋子(9个)都到了蓝方家，红胜
  if (redCount === 9 && redInEnemyBase === 9) return 'red';
  // 如果蓝方所有棋子(9个)都到了红方家，蓝胜
  if (blueCount === 9 && blueInEnemyBase === 9) return 'blue';

  return null; // 无人获胜
};