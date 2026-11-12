export type TileKind =
  | 'char'
  | 'bamboo'
  | 'dot'
  | 'wind'
  | 'dragon'
  | 'flower'
  | 'season';

export interface TileFace {
  kind: TileKind;
  value: string | number;
}

export interface Tile {
  id: string;
  kind: TileKind;
  value: string | number;
  col: number;
  row: number;
  layer: number;
  removed: boolean;
}

// 牌尺寸与步长
export const TILE_W = 44;
export const TILE_H = 36;
export const TILE_H_STEP = 33;
export const TILE_OVERLAP_X = 4;

// 层叠偏移：上层往左上抬，形成立体遮挡
export const LAYER_OFFSET_X = 7;
export const LAYER_OFFSET_Y = 9;

// 棋盘内边距
export const BOARD_PAD_LEFT = 86;
export const BOARD_PAD_TOP = 34;
export const BOARD_PAD_RIGHT = 86;
export const BOARD_PAD_BOTTOM = 110;

// 布局网格范围
export const LAYERS = 2;
export const MAX_ROW = 8;
export const MAX_COL = 8;

// 上层偏移量（让上层完美居中压在底层上）
export const UPPER_ROW_OFFSET = 1; 
export const UPPER_COL_OFFSET = 2;

// 由布局自动算出画布尺寸
export const BOARD_W =
  BOARD_PAD_LEFT +
  (MAX_COL + 1) * TILE_W -
  (LAYERS - 1) * LAYER_OFFSET_X +
  BOARD_PAD_RIGHT -
  TILE_OVERLAP_X * 2;

export const BOARD_H =
  BOARD_PAD_TOP +
  (MAX_ROW + 1) * TILE_H_STEP +
  (LAYERS - 1) * LAYER_OFFSET_Y +
  BOARD_PAD_BOTTOM;

function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateAllFaces(): TileFace[] {
  const faces: TileFace[] = [];

  // 万/条/筒 1-9，选 9 种各 2 张 = 27对 (54张)
  const nums: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (const n of nums) {
    faces.push({ kind: 'char', value: n });
    faces.push({ kind: 'char', value: n });
    faces.push({ kind: 'bamboo', value: n });
    faces.push({ kind: 'bamboo', value: n });
    faces.push({ kind: 'dot', value: n });
    faces.push({ kind: 'dot', value: n });
  }

  // 风牌：东南西北各 2 张 = 4对 (8张)
  const winds = ['E', 'S', 'W', 'N'];
  for (const w of winds) {
    faces.push({ kind: 'wind', value: w });
    faces.push({ kind: 'wind', value: w });
  }

    // 花牌：梅兰竹菊各 2 张 = 4对 (8张)
  const flowers = ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'];
  for (const f of flowers) {
    faces.push({ kind: 'flower', value: f });
    faces.push({ kind: 'flower', value: f });
  }

  // 季牌：春夏秋冬各 2 张 = 4对 (8张)
  const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
  for (const s of seasons) {
    faces.push({ kind: 'season', value: s });
    faces.push({ kind: 'season', value: s });
  }

  // 总计：27对 + 4对 + 4对 +4对 = 39对 (78张)
 
  return faces;
}

interface Bounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

function getLayerBounds(layer: number): Bounds {
  // 越上层范围越小，形成龟/金字塔感
  const inset = layer;
  return {
    minRow: inset,
    maxRow: MAX_ROW - inset,
    minCol: inset,
    maxCol: MAX_COL - inset,
  };
}

function isInTurtleShape(row: number, col: number, layer: number): boolean {
  const bounds = getLayerBounds(layer);

  // const cornerSize = 2 + Math.max(0, layer - 1);
  const cornerSize = (layer === 0) ? 2 : 3;
  
  if (row - bounds.minRow < cornerSize && col - bounds.minCol < cornerSize) return false;
  if (row - bounds.minRow < cornerSize && bounds.maxCol - col < cornerSize) return false;
  if (bounds.maxRow - row < cornerSize && col - bounds.minCol < cornerSize) return false;
  if (bounds.maxRow - row < cornerSize && bounds.maxCol - col < cornerSize) return false;

  return true;
}

function countPositionsInLayer(layer: number): number {
  const bounds = getLayerBounds(layer);
  let count = 0;
  for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
      if (isInTurtleShape(row, col, layer)) count++;
    }
  }
  return count;
}

export function totalPositions(): number {
  let total = 0;
  for (let layer = 0; layer < LAYERS; layer++) {
    total += countPositionsInLayer(layer);
  }
  return total;
}

export function createInitialTiles(): Tile[] {
  const expected = totalPositions();

  const faces = shuffleArray(generateAllFaces());
  const tiles: Tile[] = [];
  let faceIndex = 0;

  for (let layer = 0; layer < LAYERS; layer++) {
    const bounds = getLayerBounds(layer);
    for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
      for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
        if (!isInTurtleShape(row, col, layer)) continue;

        const face = faces[faceIndex % faces.length];
        tiles.push({
          id: `t_${layer}_${row}_${col}`,
          kind: face.kind,
          value: face.value,
          col,
          row,
          layer,
          removed: false,
        });
        faceIndex++;
      }
    }
  }

  if (expected !== tiles.length) {
    console.warn(`Tile position count = ${expected}, created = ${tiles.length}`);
  }

  return tiles;
}

export function tilePos(t: Tile) {
  const left =
    BOARD_PAD_LEFT +
    t.col * (TILE_W - TILE_OVERLAP_X) -
    t.layer * LAYER_OFFSET_X;

  const top =
    BOARD_PAD_TOP +
    t.row * TILE_H_STEP -
    t.layer * LAYER_OFFSET_Y;

  const zIndex = t.layer * 5000 + t.row * 300 + t.col;

  return { left, top, zIndex };
}

export function tileDisplay(tile: Tile): string {
  switch (tile.kind) {
    case 'char':
      return `${tile.value}万`;
    case 'bamboo':
      return `${tile.value}条`;
    case 'dot':
      return `${tile.value}筒`;
    case 'wind': {
      const windMap: Record<string, string> = {
        E: '东',
        S: '南',
        W: '西',
        N: '北',
      };
      return windMap[String(tile.value)] ?? String(tile.value);
    }
    case 'dragon': {
      const dragonMap: Record<string, string> = {
        Red: '中',
        Green: '发',
        White: '白',
      };
      return dragonMap[String(tile.value)] ?? String(tile.value);
    }
    case 'flower': {
      const flowerMap: Record<string, string> = {
        Plum: '梅',
        Orchid: '兰',
        Chrysanthemum: '菊',
        Bamboo: '竹',
      };
      return flowerMap[String(tile.value)] ?? String(tile.value);
    }
    case 'season': {
      const seasonMap: Record<string, string> = {
        Spring: '春',
        Summer: '夏',
        Autumn: '秋',
        Winter: '冬',
      };
      return seasonMap[String(tile.value)] ?? String(tile.value);
    }
    default:
      return String(tile.value);
  }
}