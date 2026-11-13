// client/src/books/EnglishShorts/types.ts

/** 一句短句。跟 BasicEnglish300 的 LessonItem 保持同样的字段名，方便日后互相导入 */
export interface ShortItem {
  /** 英文短句 */
  en: string;
  /** 中文意思 */
  name: string;
}

/** 一组按场景归拢的短句 */
export interface ShortGroup {
  id: string;
  name: string;
  en: string;
  icon: string;
  items: ShortItem[];
}

export interface EnglishShortsData {
  title: string;
  titleEn: string;
  description?: string;
  descriptionEn?: string;
  groups: ShortGroup[];
}
