// 动物类型 (替代 enum)
export const Animal = {
  RAT: 1,      // 鼠
  CAT: 2,      // 猫
  DOG: 3,      // 狗
  WOLF: 4,     // 狼
  LEOPARD: 5,  // 豹
  TIGER: 6,    // 虎
  LION: 7,     // 狮
  ELEPHANT: 8, // 象
} as const;
export type Animal = typeof Animal[keyof typeof Animal];

// 阵营 (替代 enum)
export const Side = {
  RED: 'red',
  BLUE: 'blue',
} as const;
export type Side = typeof Side[keyof typeof Side];

// 棋子
export interface Piece {
  animal: Animal;
  side: Side;
  id: string;
}

// 棋盘格子
export type Cell = Piece | null;

// 棋盘 9×7（行×列）
export type Board = Cell[][];

// 坐标
export interface Pos {
  row: number;
  col: number;
}

// 动物名称映射（中文）
export const ANIMAL_NAMES: Record<Animal, string> = {
  [Animal.RAT]: '鼠',
  [Animal.CAT]: '猫',
  [Animal.DOG]: '狗',
  [Animal.WOLF]: '狼',
  [Animal.LEOPARD]: '豹',
  [Animal.TIGER]: '虎',
  [Animal.LION]: '狮',
  [Animal.ELEPHANT]: '象',
};

// 动物名称映射（英文）
export const ANIMAL_NAMES_EN: Record<Animal, string> = {
  [Animal.RAT]: 'Rat',
  [Animal.CAT]: 'Cat',
  [Animal.DOG]: 'Dog',
  [Animal.WOLF]: 'Wolf',
  [Animal.LEOPARD]: 'Leopard',
  [Animal.TIGER]: 'Tiger',
  [Animal.LION]: 'Lion',
  [Animal.ELEPHANT]: 'Elephant',
};

// 动物强度（数值越大越强）
export const ANIMAL_STRENGTH: Record<Animal, number> = {
  [Animal.RAT]: 1,
  [Animal.CAT]: 2,
  [Animal.DOG]: 3,
  [Animal.WOLF]: 4,
  [Animal.LEOPARD]: 5,
  [Animal.TIGER]: 6,
  [Animal.LION]: 7,
  [Animal.ELEPHANT]: 8,
};

// 游戏状态 (替代 enum)
export const GameStatus = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  RED_WIN: 'red_win',
  BLUE_WIN: 'blue_win',
} as const;
export type GameStatus = typeof GameStatus[keyof typeof GameStatus];