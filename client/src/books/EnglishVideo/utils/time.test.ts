import { describe, expect, it } from 'vitest';
import { findLineIndex, formatTime, parseStart } from './time';
import type { TranscriptLine } from '../types';

describe('parseStart', () => {
  it('解析 mm:ss', () => {
    expect(parseStart('00:05')).toBe(5);
    expect(parseStart('01:30')).toBe(90);
    expect(parseStart('02:08')).toBe(128);
  });

  it('解析 hh:mm:ss', () => {
    expect(parseStart('1:02:03')).toBe(3723);
  });

  it('秒数直接透传（早期数据里 start 曾是小数字）', () => {
    expect(parseStart(42)).toBe(42);
    expect(parseStart(4.2)).toBeCloseTo(4.2);
  });

  it('缺失或非法值按 0 处理，不让 UI 崩', () => {
    expect(parseStart(undefined)).toBe(0);
    expect(parseStart('')).toBe(0);
    expect(parseStart('abc')).toBe(0);
    expect(parseStart('99')).toBe(0); // 只有一段，不是时间
    expect(parseStart(Number.NaN)).toBe(0);
  });
});

describe('formatTime', () => {
  it('补零到两位', () => {
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(90)).toBe('01:30');
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(-3)).toBe('00:00');
  });
});

const lines: TranscriptLine[] = [
  { index: 1, start: '00:05', en: 'a', zh: '一' },
  { index: 2, start: '00:09', en: 'b', zh: '二' },
  { index: 3, start: '00:15', en: 'c', zh: '三' },
];

describe('findLineIndex', () => {
  it('还没播到第一句时不高亮', () => {
    expect(findLineIndex(lines, 0)).toBe(-1);
    expect(findLineIndex(lines, 4)).toBe(-1);
  });

  it('落在两句之间算前一句', () => {
    expect(findLineIndex(lines, 5)).toBe(0);
    expect(findLineIndex(lines, 7)).toBe(0); // 还在第 1 句
    expect(findLineIndex(lines, 9)).toBe(1);
    expect(findLineIndex(lines, 14)).toBe(1);
    expect(findLineIndex(lines, 15)).toBe(2);
  });

  it('播过头停在最后一句', () => {
    expect(findLineIndex(lines, 999)).toBe(2);
  });

  it('空台词返回 -1', () => {
    expect(findLineIndex([], 10)).toBe(-1);
  });
});
