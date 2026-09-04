// components/games/xiangqi/board.ts
import type { Piece, Side } from './types';

export const CN: Record<string, [string, string]> = {
  K: ['帅', '将'],
  A: ['仕', '士'],
  B: ['相', '象'],
  N: ['马', '马'],
  R: ['车', '车'],
  C: ['炮', '炮'],
  P: ['兵', '卒']
};

export const VAL: Record<string, number> = {
  K: 10000,
  R: 600,
  N: 270,
  C: 300,
  B: 120,
  A: 120,
  P: 60
};

/** 初始化棋盘 */
export function initBoard(): (Piece | null)[][] {
  const b: (Piece | null)[][] = Array.from({ length: 10 }, () => Array(9).fill(null));
  const put = (r: number, c: number, s: Side, t: string) => {
    b[r][c] = { side: s, type: t };
  };

  put(0, 0, 'b', 'R'); put(0, 1, 'b', 'N'); put(0, 2, 'b', 'B'); put(0, 3, 'b', 'A'); put(0, 4, 'b', 'K');
  put(0, 5, 'b', 'A'); put(0, 6, 'b', 'B'); put(0, 7, 'b', 'N'); put(0, 8, 'b', 'R');
  put(2, 1, 'b', 'C'); put(2, 7, 'b', 'C');
  put(3, 0, 'b', 'P'); put(3, 2, 'b', 'P'); put(3, 4, 'b', 'P'); put(3, 6, 'b', 'P'); put(3, 8, 'b', 'P');

  put(9, 0, 'r', 'R'); put(9, 1, 'r', 'N'); put(9, 2, 'r', 'B'); put(9, 3, 'r', 'A'); put(9, 4, 'r', 'K');
  put(9, 5, 'r', 'A'); put(9, 6, 'r', 'B'); put(9, 7, 'r', 'N'); put(9, 8, 'r', 'R');
  put(7, 1, 'r', 'C'); put(7, 7, 'r', 'C');
  put(6, 0, 'r', 'P'); put(6, 2, 'r', 'P'); put(6, 4, 'r', 'P'); put(6, 6, 'r', 'P'); put(6, 8, 'r', 'P');

  return b;
}

/** 是否在九宫 */
export function inPalace(side: Side, r: number, c: number): boolean {
  if (c < 3 || c > 5) return false;
  return side === 'r' ? r >= 7 : r <= 2;
}

/** 查找王位置 */
export function genPos(bd: (Piece | null)[][], side: Side): [number, number] | null {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = bd[r][c];
      if (p && p.side === side && p.type === 'K') return [r, c];
    }
  }
  return null;
}

// Canvas绘制辅助线条
export function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// 棋盘标记点
export function mark(ctx: CanvasRenderingContext2D, M: number, S: number, r: number, c: number) {
  const x = M + c * S;
  const y = M + r * S;
  const d = S * 0.12;
  const g = S * 0.06;
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => {
    const px = x + sx * g;
    const py = y + sy * g;
    ctx.beginPath();
    ctx.moveTo(px + sx * d, py);
    ctx.lineTo(px, py);
    ctx.lineTo(px, py + sy * d);
    ctx.stroke();
  });
}
