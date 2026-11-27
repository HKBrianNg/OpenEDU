// VoiceAdmin 共享类型（渲染层与主进程 IPC 都用）

export interface VoiceEntry {
  id: string; // 标题 `${stem}_${index}`；正文 `${stem}_${index}_content`
  stem: string; // 章节音频子目录名
  index: number;
  chapter: string;
  part: 'title' | 'content'; // 标题读音 / 正文读音（KnowledgeBase 条目带 content.zh/en）
  slug: string; // 正文行自带 `_content` 后缀，即 mp3 文件名前缀
  zh: string;
  en: string;
  zhOk: boolean;
  enOk: boolean;
  yueOk: boolean; // 粤语（zh-HK 声音读 zh 文本）
}

export interface VoiceChapter {
  name: string;
  en: string;
}

export interface VoiceProject {
  name: string;
}

export interface CloudVoice {
  shortName: string;
  gender: string;
  locale: string;
}

export interface GenProgress {
  stage: 'start' | 'item' | 'done';
  done: number;
  total: number;
  slug: string;
  lang: 'zh' | 'en' | 'yue' | '';
  ok: boolean;
  error?: string;
}

export interface GenTask {
  stem: string;
  index: number;
  part: 'title' | 'content';
  slug: string;
  zh: string;
  en: string;
  genZh: boolean;
  genEn: boolean;
  genYue: boolean;
}

export interface IpcResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
