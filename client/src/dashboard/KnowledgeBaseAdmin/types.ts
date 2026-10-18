// 知识库配图管理：表格行模型与导出的任务清单格式

export interface CatalogRow {
  /** 唯一 key：章节文件 + 条目序号 */
  key: string;
  chapterName: string;
  chapterEn: string;
  chapterColor: string;
  contentLink: string;
  titleZh: string;
  titleEn: string;
  /** 当前占位 emoji（条目专属，回落到章节 emoji） */
  icon: string;
  imageUrl?: string;
  hasImage: boolean;
}

/** 导出给图片生成流程的任务项 */
export interface ImageTaskItem {
  chapter: string;
  /** 章节内容文件名，用于回写 imageUrl */
  contentLink: string;
  /** 中文题目 = 图片文件名（不含扩展名） */
  title: string;
  titleEn: string;
  /** 生成后要落盘的文件名 */
  file: string;
}

export interface ImageTaskFile {
  courseId: string;
  /** 单张图的积分单价，用于估算成本 */
  creditsPerImage: number;
  generatedAt: string;
  items: ImageTaskItem[];
}
