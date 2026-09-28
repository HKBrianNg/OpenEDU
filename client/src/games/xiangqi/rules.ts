// components/games/xiangqi/rules.ts
import type { Side, Move, Piece } from './types';
import { inPalace, genPos } from './board';

/** 生成棋子所有伪走法（不考虑将军） */
export function pseudo(bd: (Piece | null)[][], r: number, c: number): [number, number][] {
  const p = bd[r][c];
  if (!p) return [];
  const mv: [number, number][] = [];
  const own = p.side;
  const add = (nr: number, nc: number) => {
    const q = bd[nr][nc];
    if (!q || q.side !== own) mv.push([nr, nc]);
  };

  switch (p.type) {
    case 'K':
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 10 && nc >= 0 && nc < 9 && inPalace(own, nr, nc)) add(nr, nc);
      });
      {
        const gr = own === 'r' ? 0 : 9;
        let clear = true;
        for (let i = Math.min(r, gr) + 1; i < Math.max(r, gr); i++) if (bd[i][c]) clear = false;
        if (clear && r !== gr) {
          const g = bd[gr][c];
          if (g && g.type === 'K' && g.side !== own) mv.push([gr, c]);
        }
      }
      break;
    case 'A':
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 10 && nc >= 0 && nc < 9 && inPalace(own, nr, nc)) add(nr, nc);
      });
      break;
    case 'B': {
      const river = own === 'r' ? 5 : 4;
      [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr > 9 || nc < 0 || nc > 8) return;
        if (own === 'r' && nr < river) return;
        if (own === 'b' && nr > river) return;
        if (!bd[r + dr / 2][c + dc / 2]) add(nr, nc);
      });
      break;
    }
    case 'N': {
      const legs = [[-1, 0], [-1, 0], [1, 0], [1, 0], [0, -1], [0, -1], [0, 1], [0, 1]];
      const dirs = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]];
      dirs.forEach(([dr, dc], i) => {
        const nr = r + dr, nc = c + dc;
        const [lr, lc] = legs[i];
        if (nr < 0 || nr > 9 || nc < 0 || nc > 8) return;
        if (bd[r + lr][c + lc]) return;
        add(nr, nc);
      });
      break;
    }
    case 'R': {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
          if (!bd[nr][nc]) {
            mv.push([nr, nc]);
          } else {
            if (bd[nr][nc]!.side !== own) mv.push([nr, nc]);
            break;
          }
          nr += dr; nc += dc;
        }
      });
      break;
    }
    case 'C': {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        let nr = r + dr, nc = c + dc, jumped = false;
        while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
          if (!jumped) {
            if (!bd[nr][nc]) mv.push([nr, nc]);
            else jumped = true;
          } else if (bd[nr][nc]) {
            if (bd[nr][nc]!.side !== own) mv.push([nr, nc]);
            break;
          }
          nr += dr; nc += dc;
        }
      });
      break;
    }
    case 'P': {
      const fwd = own === 'r' ? -1 : 1;
      if (r + fwd >= 0 && r + fwd < 10) add(r + fwd, c);
      const crossed = own === 'r' ? r <= 4 : r >= 5;
      if (crossed) {
        if (c > 0) add(r, c - 1);
        if (c < 8) add(r, c + 1);
      }
      break;
    }
  }
  return mv;
}

/** 判断是否被将军 */
export function inCheck(bd: (Piece | null)[][], side: Side): boolean {
  const gp = genPos(bd, side);
  if (!gp) return false;
  const foe = side === 'r' ? 'b' : 'r';
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = bd[r][c];
      if (p && p.side === foe) {
        const moves = pseudo(bd, r, c);
        if (moves.some(([nr, nc]) => nr === gp[0] && nc === gp[1])) return true;
      }
    }
  }
  return false;
}

/** 生成合法走法（过滤掉会导致自己被将军） */
export function legalMoves(bd: (Piece | null)[][], side: Side): Move[] {
  const out: Move[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = bd[r][c];
      if (!p || p.side !== side) continue;
      for (const [nr, nc] of pseudo(bd, r, c)) {
        const cap = bd[nr][nc];
        bd[nr][nc] = p;
        bd[r][c] = null;
        if (!inCheck(bd, side)) {
          out.push({ fr: r, fc: c, tr: nr, tc: nc, cap });
        }
        bd[r][c] = p;
        bd[nr][nc] = cap;
      }
    }
  }
  return out;
}
