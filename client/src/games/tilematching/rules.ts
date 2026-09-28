import type { Tile } from './types';
import { tilePos, TILE_W } from './board';

/**
 * 判断两张牌是否可配对
 * 同种类同数值即可配对（花/季也按同值配对）
 */
export function canPair(a: Tile, b: Tile): boolean {
  return a.kind === b.kind && String(a.value) === String(b.value);
}

/**
 * 判断一张牌是否自由（未被其他牌遮挡）
 * 上层牌如果渲染矩形与当前牌重叠，则当前牌被遮挡
 */
export function isFree(tile: Tile, tiles: Tile[]): boolean {
  if (tile.removed) return false;

  const a = tilePos(tile);
  const aw = TILE_W;
  const ah = 36; // 牌的视觉高度

  for (const other of tiles) {
    if (other.id === tile.id || other.removed) continue;

    // 同层：相同位置视为重叠（理论上不应出现，但防御性判断）
    if (other.layer === tile.layer) {
      if (other.row === tile.row && other.col === tile.col) return false;
    }

    // 上层：渲染矩形有重叠则遮挡
    if (other.layer > tile.layer) {
      const b = tilePos(other);
      const bw = TILE_W;
      const bh = 36;
      const overlapX = !(a.left + aw <= b.left || b.left + bw <= a.left);
      const overlapY = !(a.top + ah <= b.top || b.top + bh <= a.top);
      if (overlapX && overlapY) return false;
    }
  }

  return true;
}

/**
 * 查找一对可配对的自由牌
 * 返回两个牌 ID 的数组，如果没有则返回空数组
 */
export function findHint(tiles: Tile[]): string[] {
  const free = tiles.filter(t => !t.removed && isFree(t, tiles));
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (canPair(free[i], free[j])) {
        return [free[i].id, free[j].id];
      }
    }
  }
  return [];
}

/**
 * 判断是否存在任何可行的移动
 */
export function hasAnyMove(tiles: Tile[]): boolean {
  return findHint(tiles).length > 0;
}