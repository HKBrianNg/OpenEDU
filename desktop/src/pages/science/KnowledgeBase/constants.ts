// client/src/books/KnowledgeBase/constants.ts
// 课程的常量与章节配色（活泼卡片风：每章一个 emoji + 主色 + 浅色底）

export const COURSE_ID = 'KnowledgeBase';

export interface ChapterTheme {
  /** 章节 emoji */
  icon: string;
  /** 主色（标题、强调） */
  color: string;
  /** 浅色底（卡片渐变起点） */
  soft: string;
}

/**
 * 按 contentLink 的主文件名配色。
 *
 * 章节体系取自《十万个为什么》第六版（18 分册），按 5–8 岁读者去掉了
 * 武器与国防、电子与信息、灾难与防护 3 册，另补一册自定义的「文化」，共 16 册。
 * 这些 key 对应 img-library/openEDU/KnowledgeBase/data.json 的 chapters。
 */
const THEME_BY_SLUG: Record<string, ChapterTheme> = {
  // 基础板块
  math: { icon: '🔢', color: '#4c6ef5', soft: '#e7ecff' },
  physics: { icon: '🧲', color: '#3a86ff', soft: '#dceaff' },
  chemistry: { icon: '⚗️', color: '#7048e8', soft: '#ece7ff' },
  astronomy: { icon: '🔭', color: '#7b6cf6', soft: '#e9e6ff' },
  earth: { icon: '🌍', color: '#2a9d8f', soft: '#ddf3ef' },
  life: { icon: '🧬', color: '#0ca678', soft: '#dcf5ec' },
  // 专题板块
  animals: { icon: '🐾', color: '#f4a261', soft: '#fff0dc' },
  plants: { icon: '🌱', color: '#43aa8b', soft: '#dff5ec' },
  'prehistoric-life': { icon: '🦕', color: '#8d6748', soft: '#f0e4d4' },
  medicine: { icon: '🩺', color: '#e63946', soft: '#ffe0e3' },
  ocean: { icon: '🌊', color: '#1098ad', soft: '#d9f2f7' },
  'brain-and-mind': { icon: '🧠', color: '#ef5da8', soft: '#ffe3f1' },
  // 热点板块（原 6 册，去掉 武器与国防 / 电子与信息 / 灾难与防护）
  'energy-and-environment': { icon: '♻️', color: '#2f9e44', soft: '#dff5e3' },
  'architecture-and-transport': { icon: '🏗️', color: '#f76707', soft: '#ffe8d6' },
  'aviation-and-spaceflight': { icon: '🚀', color: '#5c7cfa', soft: '#dbe4ff' },
  // 自定义补充：十万体系里没有人文档，但这几篇内容已存在，单独成册
  culture: { icon: '🏮', color: '#ff9f1c', soft: '#fff2d9' },
};

/** 兜底调色盘：新增章节未配主题时按序号循环取用，保证不会灰扑扑 */
const FALLBACK_THEMES: ChapterTheme[] = [
  { icon: '📘', color: '#4c6ef5', soft: '#e7ecff' },
  { icon: '🔭', color: '#7048e8', soft: '#ece7ff' },
  { icon: '🎈', color: '#f06595', soft: '#ffe5ee' },
  { icon: '🧩', color: '#0ca678', soft: '#dcf5ec' },
  { icon: '🎨', color: '#f76707', soft: '#ffe8d6' },
  { icon: '🪁', color: '#1098ad', soft: '#d9f2f7' },
];

export function chapterTheme(contentLink: string, index: number): ChapterTheme {
  const slug = contentLink.replace(/\.json$/i, '');
  return THEME_BY_SLUG[slug] ?? FALLBACK_THEMES[index % FALLBACK_THEMES.length];
}
