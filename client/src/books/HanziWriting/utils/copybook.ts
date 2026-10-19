// 字帖的版式计算：A4 纸多大、每页放多少字、字怎么分页。
// 渲染有两种目标（屏幕 SVG 矢量、PDF 里的位图），但版式是同一套，所以算坐标的活儿都放这儿。

import type { CharStrokes, HanziChar, ScriptMode } from '../types';
import { charOf, wordOf } from '../constants';
import { getStrokeData, loadGrade } from '../hooks/useStrokeData';

/** A4，单位 mm */
export const PAGE = { width: 210, height: 297 };
/** 页边距，留白给打印机别啃掉边上的格 */
export const MARGIN = 15;
/** 可写区域 */
export const CONTENT = {
  width: PAGE.width - MARGIN * 2,
  height: PAGE.height - MARGIN * 2,
};

/**
 * 笔画数据的 y 轴是朝上的（字体坐标系，字形盒 y∈[-124,900]），
 * 而 SVG 和 canvas 的 y 轴朝下。渲染范字前必须翻过来：
 * 先 scale(1,-1) 再把结果下移 900，字形盒正好落到 0–1024。
 * 不翻的话整个字是上下颠倒的。
 */
export const GLYPH_FLIP_OFFSET = 900;

export type CopyBookLayout = 'row' | 'grid';

interface LayoutSpec {
  /** 一个田字格的边长 */
  cell: number;
  /** 一行几个格 */
  cols: number;
  /** 一页几个字 */
  perPage: number;
  /** 范字后面跟几个空格（描红用） */
  blanks: number;
  /** 格子上方那行字的拼音 + 例词，占多高 */
  label: number;
}

export const LAYOUTS: Record<CopyBookLayout, LayoutSpec> = {
  // 每字一行：范字在最左，右边一串空格照着写，适合练笔顺
  row: { cell: 20, cols: 9, perPage: 8, blanks: 8, label: 7 },
  // 网格铺满：一格一个字，适合复习认读
  grid: { cell: CONTENT.width / 7, cols: 7, perPage: 70, blanks: 0, label: 0 },
};

/** 字帖里的一个字：字形、拼音、例词、笔画数据都齐了 */
export interface CopyBookItem {
  entry: HanziChar;
  char: string;
  pinyin: string;
  word: string;
  glyph: CharStrokes;
}

/**
 * 把选中的字配齐笔画数据。
 * 选中的字可能跨年级，所以先把涉及到的年级都装进来，再逐个取。
 */
export async function loadCopyBookItems(
  entries: HanziChar[],
  script: ScriptMode,
): Promise<CopyBookItem[]> {
  const grades = [...new Set(entries.map((e) => e.grade))];
  await Promise.all(grades.map((g) => loadGrade(g, script)));

  const items: CopyBookItem[] = [];
  for (const entry of entries) {
    const char = charOf(entry, script);
    const glyph = getStrokeData(char, script);
    if (!glyph) continue; // 理论上不会发生，生成脚本已保证每个字都有
    items.push({
      entry,
      char,
      pinyin: entry.pinyin,
      word: wordOf(entry, script),
      glyph,
    });
  }
  return items;
}

/** 按每页容量切分页 */
export function paginate<T>(items: T[], layout: CopyBookLayout): T[][] {
  const size = LAYOUTS[layout].perPage;
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages.length ? pages : [[]];
}
