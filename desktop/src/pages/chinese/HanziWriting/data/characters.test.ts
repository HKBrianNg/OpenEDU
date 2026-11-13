import { describe, expect, it } from 'vitest';
import { AVAILABLE_GRADES, GRADE_CHARS } from './characters.generated';
import { CATEGORIES, GRADES } from '../constants';

const ALL = AVAILABLE_GRADES.flatMap((g) => GRADE_CHARS[g] ?? []);
const KNOWN_CATS = new Set(CATEGORIES.map((c) => c.id));

describe('汉字书写的字表', () => {
  it('每个年级都不是空的', () => {
    expect(AVAILABLE_GRADES.length).toBeGreaterThan(0);
    for (const grade of AVAILABLE_GRADES) {
      expect(GRADE_CHARS[grade]?.length ?? 0, `${grade} 年级没字`).toBeGreaterThan(0);
    }
  });

  it('年级号都在 1–6 之间', () => {
    for (const grade of AVAILABLE_GRADES) {
      expect(GRADES).toContain(grade);
    }
  });

  it('六个年级都齐了，字数上千', () => {
    expect(AVAILABLE_GRADES).toEqual([1, 2, 3, 4, 5, 6]);
    // 小学识字量在 1600 上下，字表被误删一大半时这里会先响
    expect(ALL.length).toBeGreaterThan(1500);
  });

  it('同一个字不会出现在两个年级', () => {
    const chars = ALL.map((item) => item.char);
    const dup = chars.filter((c, i) => chars.indexOf(c) !== i);
    expect(dup).toEqual([]);
  });

  it('每个字都有拼音、例词、英文释义和分类', () => {
    for (const item of ALL) {
      expect(item.pinyin, `「${item.char}」缺拼音`).toBeTruthy();
      expect(item.word, `「${item.char}」缺例词`).toBeTruthy();
      expect(item.en, `「${item.char}」缺英文释义`).toBeTruthy();
      expect(item.cats.length, `「${item.char}」缺分类`).toBeGreaterThan(0);
    }
  });

  it('用到的分类都是认识的分类', () => {
    for (const item of ALL) {
      for (const cat of item.cats) {
        expect(KNOWN_CATS.has(cat), `「${item.char}」用到了没定义的分类 ${cat}`).toBe(true);
      }
    }
  });

  it('笔画数是正数', () => {
    for (const item of ALL) {
      expect(item.strokes, `「${item.char}」笔画数不对`).toBeGreaterThan(0);
    }
  });

  it('每个年级的字挂号跟实际所在年级一致', () => {
    for (const grade of AVAILABLE_GRADES) {
      for (const item of GRADE_CHARS[grade] ?? []) {
        expect(item.grade, `「${item.char}」的 grade 字段和实际分组不一致`).toBe(grade);
      }
    }
  });
});

// 有没有生成对应的笔画数据文件由运行时兜底（PracticeArea 会显示加载失败），
// 这里不碰 node:fs —— 测试跑在没有 @types/node 的配置里。
