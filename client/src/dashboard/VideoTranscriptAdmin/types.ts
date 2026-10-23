// 视频字幕管理：一行 = 一个视频条目

export interface VideoRow {
  /** `${grade}#${id}` */
  key: string;
  /** 年级目录名，如 Kingdergarten —— 决定台词文件落在哪个目录 */
  grade: string;
  /** 年级中文名，如 幼稚园 */
  gradeName: string;
  id: number;
  titleEn: string;
  titleZh: string;
  url: string;
  /** 相对年级目录的路径，如 transcripts/PeppaPigMuddyPuddles.json */
  transcriptFile: string;
  /** 台词文件存在且 lines 非空 */
  hasTranscript: boolean;
  /** 台词句数，0 = 没有 */
  lineCount: number;
}

/** 导出给 CodeBuddy 的任务清单里的一项 */
export interface TranscriptTaskItem {
  grade: string;
  gradeName: string;
  id: number;
  titleEn: string;
  titleZh: string;
  url: string;
  transcriptFile: string;
  /** 目标写入路径，相对 public/data/EnglishVideo/ */
  targetPath: string;
}

export interface TranscriptTaskFile {
  courseId: string;
  generatedAt: string;
  /** 数据目录前缀，方便对端定位 */
  dataRoot: string;
  items: TranscriptTaskItem[];
}
