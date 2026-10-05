export type Locale = 'zh' | 'en';

// 允许翻译值为字符串或字符串数组（如日历的星期/月份）
export type Messages = Record<string, string | string[]>;