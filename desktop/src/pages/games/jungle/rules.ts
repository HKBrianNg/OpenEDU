// rules.ts
import type { CellType, JunglePiece, Side, Move } from './types';
import { RANK_MAP, getPieceAt } from './board';

export function canEat(attacker: JunglePiece, defender: JunglePiece, cellType: CellType[][]): boolean {
  const tCell = cellType[attacker.y][attacker.x];
  const dCell = cellType[defender.y][defender.x];

  let atkRank = RANK_MAP[attacker.animal];
  let defRank = RANK_MAP[defender.animal];
  if (tCell === 'trap') atkRank = 0;
  if (dCell === 'trap') defRank = 0;

  if (attacker.animal === 'mouse' && defender.animal === 'elephant') return true;
  if (attacker.animal === 'elephant' && defender.animal === 'mouse') return false;

  if (defender.inRiver && !attacker.inRiver) return false;
  return atkRank >= defRank;
}

function hasMouseInRiverLine(pieces: JunglePiece[], y: number, xStart: number, xEnd: number): boolean {
  return pieces.some(p =>
    p.y === y
    && p.animal === 'mouse'
    && p.x >= xStart
    && p.x <= xEnd
    && p.inRiver
  );
}

export function getValidMoves(pieces: JunglePiece[], piece: JunglePiece, cellType: CellType[][]): [number, number][] {
  const moves: [number, number][] = [];
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const { x, y } = piece;

  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= 7 || ny < 0 || ny >= 9) continue;
    const targetCell = cellType[ny][nx];
    if (targetCell === 'river' && piece.animal !== 'mouse') continue;

    const targetPiece = getPieceAt(pieces, nx, ny);
    if (targetPiece) {
      if (targetPiece.side === piece.side) continue;
      if (!canEat(piece, targetPiece, cellType)) continue;
    }
    moves.push([nx, ny]);
  }

  // 狮虎跳河
  if (piece.animal === 'lion' || piece.animal === 'tiger') {
    if ((y === 3 || y === 4) && x === 0) {
      if (!hasMouseInRiverLine(pieces, y, 1, 2)) {
        const jumpX = 3;
        const targetPiece = getPieceAt(pieces, jumpX, y);
        if (!targetPiece || (targetPiece.side !== piece.side && canEat(piece, targetPiece, cellType))) {
          moves.push([jumpX, y]);
        }
      }
    }
    if ((y === 3 || y === 4) && x === 3) {
      if (!hasMouseInRiverLine(pieces, y, 1, 2)) {
        const jumpX = 0;
        const targetPiece = getPieceAt(pieces, jumpX, y);
        if (!targetPiece || (targetPiece.side !== piece.side && canEat(piece, targetPiece, cellType))) {
          moves.push([jumpX, y]);
        }
      }
    }
    if ((y === 3 || y === 4) && x === 3) {
      if (!hasMouseInRiverLine(pieces, y, 4, 5)) {
        const jumpX = 6;
        const targetPiece = getPieceAt(pieces, jumpX, y);
        if (!targetPiece || (targetPiece.side !== piece.side && canEat(piece, targetPiece, cellType))) {
          moves.push([jumpX, y]);
        }
      }
    }
    if ((y === 3 || y === 4) && x === 6) {
      if (!hasMouseInRiverLine(pieces, y, 4, 5)) {
        const jumpX = 3;
        const targetPiece = getPieceAt(pieces, jumpX, y);
        if (!targetPiece || (targetPiece.side !== piece.side && canEat(piece, targetPiece, cellType))) {
          moves.push([jumpX, y]);
        }
      }
    }
  }

  return moves;
}

export function getAllMoves(pieces: JunglePiece[], side: Side, cellType: CellType[][]): Move[] {
  const result: Move[] = [];
  pieces.filter(p => p.side === side).forEach(p => {
    const ms = getValidMoves(pieces, p, cellType);
    ms.forEach(([tx, ty]) => {
      result.push({ piece: p, toX: tx, toY: ty });
    });
  });
  return result;
}

export function isGameOver(pieces: JunglePiece[]): Side | null {
  const blueDen = getPieceAt(pieces, 3, 0);
  const redDen = getPieceAt(pieces, 3, 8);
  if (blueDen && blueDen.side === 'blue') return 'blue';
  if (redDen && redDen.side === 'red') return 'red';
  return null;
}