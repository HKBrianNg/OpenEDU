export type PracticeMode = 'stroke' | 'trace' | 'write';

export type CharCategory =
  | 'number'
  | 'nature'
  | 'weather'
  | 'animal'
  | 'plant'
  | 'body'
  | 'family'
  | 'people'
  | 'position'
  | 'time'
  | 'color'
  | 'food'
  | 'clothes'
  | 'home'
  | 'school'
  | 'transport'
  | 'action'
  | 'state'
  | 'quantity'
  | 'emotion'
  | 'society'
  | 'particle';

/** 一次练习里的一条字，字段由 scripts/gen-hanzi-strokes.mjs 生成 */
export interface HanziChar {
  char: string;
  /** 繁体字形。繁简同形的字跟 char 一样 */
  traditional: string;
  pinyin: string;
  /** 例词 */
  word: string;
  /** 繁体例词 */
  wordTraditional: string;
  /** 英文释义 */
  en: string;
  /** 1–6 年级 */
  grade: number;
  cats: CharCategory[];
  /** 笔画数（在数据里就算好，列表上不用等笔画数据加载完就能显示） */
  strokes: number;
  /** 繁体笔画数，通常比 strokes 多 */
  strokesTraditional: number;
}

/** 用什么字形练习 */
export type ScriptMode = 'simplified' | 'traditional';

/** 一个字的笔画数据，坐标系 1024×1024。生成物见 data/strokes/<simplified|traditional>/gradeN.js */
export interface CharStrokes {
  /** 每一笔的 SVG path */
  strokes: string[];
  /** 每一笔的中线采样点，笔顺动画沿着它推进 */
  medians: number[][][];
}
