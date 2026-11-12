export type TileKind =
  | 'char'
  | 'bamboo'
  | 'dot'
  | 'wind'
  | 'dragon'
  | 'flower'
  | 'season';

export interface Tile {
  id: string;
  kind: TileKind;
  value: string | number;
  col: number;
  row: number;
  layer: number;
  removed: boolean;
}

export interface GameState {
  tiles: Tile[];
  selected: string[];
  hintIds: string[];
  undoStack: Tile[][];
  steps: number;
  remaining: number;
  elapsedMs: number;
  status: 'playing' | 'won' | 'stuck';
  startedAt: number | null;
}