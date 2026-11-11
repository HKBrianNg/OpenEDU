// client/src/i18n/types.ts

export type Locale = 'zh' | 'en';

// 允许翻译值为字符串或字符串数组（如日历的星期/月份）
export type MessageValue = string | string[];

// 消息字典：key 为翻译键，value 为字符串或数组
export type MessageDict = {
  [key: string]: MessageValue;
};

// 多语言消息集合
export type Messages = {
  [key in Locale]: MessageDict;
};

// 子模块导出类型（用于约束子模块的导出结构）
export type ModuleMessages = MessageDict;