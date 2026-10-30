// client/src/books/BasicEnglish300/types.ts

export interface LessonItem {
  /** 新格式：文本統一放在 title 下 */
  title?: {
    zh: string;
    en: string;
  };
  /**
   * 舊字段：過渡期保留，讓現有組件暫時不報錯。
   * 等所有讀取處都改成讀 title 之後，再統一刪掉。
   */
  name?: string;
  en?: string;
  lessonImage?: string;
}

export interface Chapter {
  name: string;
  en: string;
  /** 實際數據裡叫 contentLink */
  contentLink?: string;
  lessonsFile?: string;
  items: LessonItem[];
}

export interface BasicEnglishData {
  title: string;
  titleEn: string;
  chapters: Chapter[];
}