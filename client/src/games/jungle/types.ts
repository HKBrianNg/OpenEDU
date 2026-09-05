// types.ts
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

export interface Move {
  piece: JunglePiece;
  toX: number;
  toY: number;
}

export interface JungleGameProps {
  isMobile?: boolean;
  onExit?: () => void;
}