// client/src/books/EnglishShorts/types.ts

/** 一句短句。跟 BasicEnglish300 的 LessonItem 保持同样的字段名，方便日后互相导入 */
export interface ShortItem {
  /** 英文短句 */
  en: string;
  /** 中文意思 */
  name: string;
  /** VoiceAdmin 生成音频的 slug（load 时按文件顺序算好，与 IPC 去重规则一致） */
  audioSlug?: string;
  /** 预生成 mp3 地址（EnglishShorts/audio/<stem>/<slug>_en.mp3） */
  audioUrlEn?: string;
  /** 预生成 mp3 地址（EnglishShorts/audio/<stem>/<slug>_zh.mp3） */
  audioUrlZh?: string;
  /** 预生成 mp3 地址（EnglishShorts/audio/<stem>/<slug>_yue.mp3，粤语） */
  audioUrlYue?: string;
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
