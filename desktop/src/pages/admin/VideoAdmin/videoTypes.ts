// desktop/src/pages/admin/VideoAdmin/videoTypes.ts

/** 年级下拉选项（来自目录 data.json 的 chapters） */
export interface GradeOption {
  value: string;
  label: string;
}

/** 目录里的一条视频（对齐 tools video.cjs loadCatalog 的行结构） */
export interface VideoRow {
  key: string; // "<grade>#<id>"
  grade: string;
  gradeName: string;
  id: number;
  series: string;
  episode: string;
  titleEn: string;
  titleZh: string;
  duration: string;
  channel: string;
  url: string;
  transcriptFile: string;
  hasTranscript: boolean;
  lineCount: number;
}

/** videos:load 返回结构 */
export interface VideoCatalogResult {
  ok: boolean;
  rows?: VideoRow[];
  problems?: string[];
  grades?: GradeOption[];
  courseDir?: string;
  error?: string;
}

/** 在线搜索结果（对齐 tools searchOnline） */
export interface VideoSearchItem {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  url: string;
}

/** 字幕抓取结果 */
export interface TranscriptResult {
  ok: boolean;
  file?: string;
  lines?: number;
  id?: number;
  error?: string;
}

/** videos:import-online 返回结构 */
export interface VideoImportResult {
  ok: boolean;
  id?: number;
  grade?: string;
  transcript?: TranscriptResult | null;
  error?: string;
}

/** 导入弹窗表单 */
export interface VideoImportInput {
  grade: string;
  url: string;
  titleEn: string;
  titleZh: string;
  series: string;
  duration: string;
  channel: string;
  platform: string;
  fetchSubs: boolean;
}

/** 编辑弹窗表单 */
export interface VideoUpdateInput {
  grade: string;
  id: number;
  series: string;
  episode: string;
  titleEn: string;
  titleZh: string;
}
