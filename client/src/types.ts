export type LocalText = {
  zh: string;
  en: string;
};

// 通用双语读取工具，全项目复用
export function getLocalText(field: LocalText, locale: 'zh' | 'en'): string {
  return field[locale] || field.en || field.zh;
}
