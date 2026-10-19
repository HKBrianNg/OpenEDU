import type { CharCategory, HanziChar, PracticeMode, ScriptMode } from './types';

/** 田字格边长（px） */
export const GRID_SIZE = 300;

// 简繁两套字形是同一批字的两种写法：字可能不同（龙／龍），
// 笔画数几乎都不同（5 画／16 画）。下面三个函数按当前字形取值，
// 免得每个组件里都写一遍三元判断。

/** 当前要练的字形 */
export function charOf(entry: HanziChar, script: ScriptMode): string {
  return script === 'traditional' ? entry.traditional : entry.char;
}

/** 当前字形对应的例词 */
export function wordOf(entry: HanziChar, script: ScriptMode): string {
  return script === 'traditional' ? entry.wordTraditional : entry.word;
}

/** 当前字形的笔画数 */
export function strokesOf(entry: HanziChar, script: ScriptMode): number {
  return script === 'traditional' ? entry.strokesTraditional : entry.strokes;
}

export const COLORS = {
  /** 范字的笔画色 */
  stroke: '#3a3a3a',
  /** 描红用的浅灰轮廓 */
  outline: '#dcdcdc',
  /** 描红时用户自己画上去的笔画 */
  drawing: '#2f54eb',
  /** 写对时闪一下的高亮 */
  highlight: '#95de64',
  /** 田字格的辅助虚线 */
  gridLine: '#f2b8b8',
  /** 田字格外框 */
  gridBorder: '#d9d9d9',
  /** 默写格里的笔迹 */
  pen: '#2f54eb',
};

export const SPEED_MIN = 0.5;
export const SPEED_MAX = 2;
export const SPEED_STEP = 0.1;
export const SPEED_DEFAULT = 1;

export const MODES: PracticeMode[] = ['stroke', 'trace', 'write'];

/** 小学 1–6 年级 */
export const GRADES = [1, 2, 3, 4, 5, 6] as const;

/**
 * 分类。跟年级是两个正交的维度：年级回答「几年级要会」，
 * 分类回答「这说的是什么」，一个字可以同时属于多个分类。
 * 名字走 i18n，key 是 hanziwriting.cat.<id>。
 */
export const CATEGORIES: { id: CharCategory; icon: string }[] = [
  { id: 'number', icon: '🔢' },
  { id: 'nature', icon: '⛰️' },
  { id: 'weather', icon: '🌤️' },
  { id: 'animal', icon: '🐰' },
  { id: 'plant', icon: '🌱' },
  { id: 'body', icon: '🖐️' },
  { id: 'family', icon: '👨‍👩‍👧' },
  { id: 'people', icon: '🧒' },
  { id: 'position', icon: '🧭' },
  { id: 'time', icon: '🕐' },
  { id: 'color', icon: '🎨' },
  { id: 'food', icon: '🍚' },
  { id: 'clothes', icon: '👕' },
  { id: 'home', icon: '🏠' },
  { id: 'school', icon: '🎒' },
  { id: 'transport', icon: '🚗' },
  { id: 'action', icon: '🏃' },
  { id: 'state', icon: '📏' },
  { id: 'quantity', icon: '⚖️' },
  { id: 'emotion', icon: '💗' },
  { id: 'society', icon: '🏛️' },
  { id: 'particle', icon: '💬' },
];
