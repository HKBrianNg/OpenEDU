// client/src/books/EnglishVideo/types.ts
//
// 看短片学英文的数据形状。对应 public/data/EnglishVideo/：
//   data.json                        索引（年级列表）
//   {Grade}/{Grade}.json             每个年级：categories（按来源网站）→ items（短片）
//   {Grade}/transcripts/*.json       台词，每部片一个文件
//
// 有 transcript 的片子才能「学习」和「测验」；没有就只有信息 + 跳转观看。

export interface VideoChapter {
  name: string
  en: string
  contentLink: string
}

export interface VideoIndexData {
  title: string
  titleEn: string
  chapters: VideoChapter[]
}

/** 台词里的一句 */
export interface TranscriptLine {
  index: number
  /** 该句在短片里的起始秒数（可选，用于跳播） */
  start?: number
  en: string
  zh: string
  /**
   * 可选：手动指定要挖空的词/短语（需在 en 中原样出现）。
   * 不填则由 pickBlank 自动挑一个实词。
   */
  blank?: string
}

/** 一个 transcript 文件的内容 */
export interface TranscriptFile {
  lines: TranscriptLine[]
}

export interface VideoItem {
  id: number
  englishName: string
  chineseName: string
  durationPerEpisode: string
  ageRange: string
  producer: string
  description: string
  descriptionEn: string
  /** 观看地址（B站 / 官网等外链） */
  url: string
  /**
   * 台词文件相对路径（相对所在年级目录），如 'transcripts/YakkaDee_S01E01.json'。
   * 没有这个字段 = 没有台词 = 不提供学习和测验。
   */
  transcriptFile?: string
}

export interface VideoCategory {
  name: string
  en: string
  website: string
  items: VideoItem[]
}

export interface VideoGradeData {
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  categories: VideoCategory[]
}
