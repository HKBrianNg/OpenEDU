// client/src/books/EnglishVideo/utils/time.ts
//
// 台词时间轴换算。数据里 start 是 "mm:ss"（如 "00:05"），也可能写成 "hh:mm:ss"。

import type { TranscriptLine } from '../types';

/** "00:05" → 5；"01:30" → 90；"1:02:03" → 3723。解析不了按 0 处理。 */
export function parseStart(v?: string | number): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (!v) return 0;
  const parts = String(v)
    .split(':')
    .map((p) => Number(p.trim()));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** 秒 → "mm:ss"，用于显示进度 */
export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * 当前播放到第几句：取最后一个「起点 ≤ 当前时间」的句子。
 * 没开始播（时间早于第一句）返回 -1，表示不高亮任何一句。
 */
export function findLineIndex(lines: TranscriptLine[], time: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (parseStart(lines[i].start) <= time) idx = i;
    else break;
  }
  return idx;
}
