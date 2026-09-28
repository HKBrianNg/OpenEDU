// client/src/games/checker/types.ts

// 坐标点 (行, 列)
export interface Point {
  r: number;
  c: number;
}

// 玩家身份：'red' (下方/人类), 'blue' (上方/AI)
export type Player = 'red' | 'blue';

// 棋子定义：null 表示空，否则包含所属玩家
export type Piece = { player: Player } | null;

export type Board = Piece[][]

// 移动动作
export interface Move {
  from: Point;
  to: Point;
}

// 游戏状态
export interface GameState {
  board: Piece[][];       // 17x17 的二维数组
  currentPlayer: Player;  // 当前轮到谁
  selected: Point | null; // 当前选中的棋子
  validMoves: Point[];    // 当前选中棋子的合法落点
  winner: Player | 'draw' | null; // 获胜者
  history: Piece[][][];   // 悔棋用的历史记录栈
}