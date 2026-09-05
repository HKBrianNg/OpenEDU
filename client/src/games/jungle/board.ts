// board.ts
import type { CellType, JunglePiece, Animal } from './types';

export const RANK_MAP: Record<Animal, number> = {
  elephant: 8,
  lion: 7,
  tiger: 6,
  leopard: 5,
  wolf: 4,
  dog: 3,
  cat: 2,
  mouse: 1
};

export const PIECE_SCORE: Record<Animal, number> = {
  elephant: 100,
  lion: 90,
  tiger: 85,
  leopard: 70,
  wolf: 60,
  dog: 50,
  cat: 40,
  mouse: 35
};

export const ANIMAL_NAMES: Record<Animal, string> = {
  elephant: '象',
  lion: '狮',
  tiger: '虎',
  leopard: '豹',
  wolf: '狼',
  dog: '狗',
  cat: '猫',
  mouse: '鼠'
};

export const createBoardCellType = (): CellType[][] => {
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
};

export const initPieces = (): JunglePiece[] => {
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
};

export const clonePieces = (list: JunglePiece[]): JunglePiece[] => {
  return list.map(p => ({ ...p }));
};

export const getPieceAt = (pieces: JunglePiece[], x: number, y: number): JunglePiece | undefined => {
  return pieces.find(p => p.x === x && p.y === y);
};