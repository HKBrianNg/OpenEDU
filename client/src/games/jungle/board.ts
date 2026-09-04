import type { JunglePiece, CellType, Side } from './types';
import { RANK_MAP } from './types';

export function createBoardCellType(): CellType[][] {
  const grid: CellType[][] = Array.from({ length: 9 }, () => Array(7).fill('normal'));
  for (let y = 3; y <= 4; y++) {
    grid[y][1] = 'river';
    grid[y][2] = 'river';
    grid[y][4] = 'river';
    grid[y][5] = 'river';
  }
  grid[0][3] = 'den';
  grid[8][3] = 'den';
  grid[0][2] = 'trap'; grid[0][4] = 'trap'; grid[1][3] = 'trap';
  grid[8][2] = 'trap'; grid[8][4] = 'trap'; grid[7][3] = 'trap';
  return grid;
}

export function initPieces(): JunglePiece[] {
  return [
    { animal: 'lion', side: 'red', x: 0, y: 0, inRiver: false },
    { animal: 'tiger', side: 'red', x: 6, y: 0, inRiver: false },
    { animal: 'elephant', side: 'red', x: 2, y: 1, inRiver: false },
    { animal: 'leopard', side: 'red', x: 4, y: 1, inRiver: false },
    { animal: 'wolf', side: 'red', x: 1, y: 2, inRiver: false },
    { animal: 'dog', side: 'red', x: 5, y: 2, inRiver: false },
    { animal: 'cat', side: 'red', x: 0, y: 2, inRiver: false },
    { animal: 'mouse', side: 'red', x: 6, y: 2, inRiver: false },

    { animal: 'lion', side: 'blue', x: 6, y: 8, inRiver: false },
    { animal: 'tiger', side: 'blue', x: 0, y: 8, inRiver: false },
    { animal: 'elephant', side: 'blue', x: 4, y: 7, inRiver: false },
    { animal: 'leopard', side: 'blue', x: 2, y: 7, inRiver: false },
    { animal: 'wolf', side: 'blue', x: 5, y: 6, inRiver: false },
    { animal: 'dog', side: 'blue', x: 1, y: 6, inRiver: false },
    { animal: 'cat', side: 'blue', x: 6, y: 6, inRiver: false },
    { animal: 'mouse', side: 'blue', x: 0, y: 6, inRiver: false },
  ];
}

export function clonePieces(list: JunglePiece[]): JunglePiece[] {
  return list.map(p => ({ ...p }));
}

export function getPieceAt(pieces: JunglePiece[], x: number, y: number): JunglePiece | undefined {
  return pieces.find(p => p.x === x && p.y === y);
}

export function canEat(attacker: JunglePiece, defender: JunglePiece, cellType: CellType[][]): boolean {
  const tx = attacker.x, ty = attacker.y;
  const dx = defender.x, dy = defender.y;
  const tCell = cellType[ty][tx];
  const dCell = cellType[dy][dx];

  let atkRank = RANK_MAP[attacker.animal];
  let defRank = RANK_MAP[defender.animal];
  if (tCell === 'trap') atkRank = 0;
  if (dCell === 'trap') defRank = 0;

  if (attacker.animal === 'mouse' && defender.animal === 'elephant') return true;
  if (attacker.animal === 'elephant' && defender.animal === 'mouse') return false;

  if (defender.inRiver && !attacker.inRiver) return false;
  return atkRank >= defRank;
}

export function hasMouseInRiverLine(pieces: JunglePiece[], y: number, xStart: number, xEnd: number) {
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

export function getAllMoves(pieces: JunglePiece[], side: Side, cellType: CellType[][]) {
  const result: { piece: JunglePiece; toX: number; toY: number }[] = [];
  pieces.filter(p => p.side === side).forEach(p => {
    const ms = getValidMoves(pieces, p, cellType);
    ms.forEach(([tx, ty]) => {
      result.push({ piece: p, toX: tx, toY: ty });
    });
  });
  return result;
}
