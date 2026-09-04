// components/games/xiangqi/types.ts
export type Side = 'r' | 'b';

export interface Piece {
  side: Side;
  type: string;
}

export interface Move {
  fr: number;
  fc: number;
  tr: number;
  tc: number;
  cap: Piece | null;
}

export interface HistoryItem {
  bd: (Piece | null)[][];
  turn: Side;
}

export interface GameState {
  bd: (Piece | null)[][];
  turn: Side;
  sel: [number, number] | null;
  legal: [number, number][];
  history: HistoryItem[];
  over: boolean;
  vsAI: boolean;
}

export interface XiangqiGameProps {
  isMobile?: boolean;
  onExit?: () => void;
}
