export type Player = 'red' | 'blue';
export type Cell = Player | null;
export type BoardState = Cell[][];
export type Position = { r: number; c: number };

export const BOARD_SIZE = 9;

export const isValidPos = (r: number, c: number): boolean => {
  if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
  const mid = 4;
  const dist = Math.abs(r - mid); // 0..4
  const minC = dist;
  const maxC = 8 - dist;
  return c >= minC && c <= maxC;
};

export const initBoard = (): BoardState => {
  const board: BoardState = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

  const positions: { r: number; c: number; side: Player }[] = [
    // 蓝方 1+3+5
    { r: 0, c: 4, side: 'blue' },
    { r: 1, c: 3, side: 'blue' },
    { r: 1, c: 4, side: 'blue' },
    { r: 1, c: 5, side: 'blue' },
    { r: 2, c: 2, side: 'blue' },
    { r: 2, c: 3, side: 'blue' },
    { r: 2, c: 4, side: 'blue' },
    { r: 2, c: 5, side: 'blue' },
    { r: 2, c: 6, side: 'blue' },

    // 红方 1+3+5
    { r: 8, c: 4, side: 'red' },
    { r: 7, c: 3, side: 'red' },
    { r: 7, c: 4, side: 'red' },
    { r: 7, c: 5, side: 'red' },
    { r: 6, c: 2, side: 'red' },
    { r: 6, c: 3, side: 'red' },
    { r: 6, c: 4, side: 'red' },
    { r: 6, c: 5, side: 'red' },
    { r: 6, c: 6, side: 'red' },
  ];

  for (const p of positions) {
    if (isValidPos(p.r, p.c)) {
      board[p.r][p.c] = p.side;
    }
  }

  return board;
};

export function checkWin(board: BoardState): Player | null {
  let blueWin = true;
  let redWin = true;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p === 'blue') {
        if (!inRedTargetZone(r, c)) blueWin = false;
      } else if (p === 'red') {
        if (!inBlueTargetZone(r, c)) redWin = false;
      }
    }
  }

  if (blueWin) return 'blue';
  if (redWin) return 'red';
  return null;
}

const inBlueTargetZone = (r: number, c: number): boolean => {
  if (r === 0) return c === 4;
  if (r === 1) return c >= 3 && c <= 5;
  if (r === 2) return c >= 2 && c <= 6;
  return false;
};

const inRedTargetZone = (r: number, c: number): boolean => {
  if (r === 8) return c === 4;
  if (r === 7) return c >= 3 && c <= 5;
  if (r === 6) return c >= 2 && c <= 6;
  return false;
};

export function getValidMoves(board: BoardState, pos: Position): Position[] {
  const piece = board[pos.r][pos.c];
  if (!piece) return [];

  const directions: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
  ];

  const key = (r: number, c: number) => `${r},${c}`;
  const stepSet = new Set<string>();
  const jumpSet = new Set<string>();

  const tryJumpChain = (r: number, c: number) => {
    for (const [dr, dc] of directions) {
      const mr = r + dr;
      const mc = c + dc;
      const jr = r + dr * 2;
      const jc = c + dc * 2;
      if (!isValidPos(mr, mc) || !isValidPos(jr, jc)) continue;
      if (board[mr][mc] !== null && board[mr][mc] !== piece && board[jr][jc] === null) {
        if (!jumpSet.has(key(jr, jc))) {
          jumpSet.add(key(jr, jc));
          tryJumpChain(jr, jc);
        }
      }
    }
  };

  let hasEnemy = false;

  for (const [dr, dc] of directions) {
    const nr = pos.r + dr;
    const nc = pos.c + dc;
    if (!isValidPos(nr, nc)) continue;

    if (board[nr][nc] === null) {
      stepSet.add(key(nr, nc));
    } else if (board[nr][nc] !== piece) {
      hasEnemy = true;
    }
  }

  if (hasEnemy) {
    tryJumpChain(pos.r, pos.c);
  }

  const out = new Set([...stepSet, ...jumpSet]);

  return Array.from(out).map(k => {
    const [r, c] = k.split(',').map(Number);
    return { r, c };
  });
}