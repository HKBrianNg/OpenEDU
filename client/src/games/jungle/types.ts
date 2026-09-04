export type Animal = 'elephant' | 'lion' | 'tiger' | 'leopard' | 'wolf' | 'dog' | 'cat' | 'mouse';
export type Side = 'red' | 'blue';
export type CellType = 'normal' | 'river' | 'trap' | 'den';

export interface JunglePiece {
  animal: Animal;
  side: Side;
  x: number;
  y: number;
  inRiver: boolean;
}

export interface DragState {
  active: boolean;
  piece: JunglePiece | null;
  hoverX: number | null;
  hoverY: number | null;
}

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

export const NAME_MAP: Record<Animal, string> = {
  elephant: "象",
  lion: "狮",
  tiger: "虎",
  leopard: "豹",
  wolf: "狼",
  dog: "狗",
  cat: "猫",
  mouse: "鼠"
};

export const CELL_SIZE = 60;
export const BOARD_WIDTH = 7 * CELL_SIZE;
export const BOARD_HEIGHT = 9 * CELL_SIZE;
