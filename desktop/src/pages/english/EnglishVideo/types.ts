// client/src/books/EnglishVideo/types.ts
//
// 看短片学英文的数据形状。对应 public/data/EnglishVideo/：
//   data.json                        索引（年级列表）
//   {Grade}/{Grade}.json             年级内容，items[] 直接放顶层
//   {Grade}/transcripts/*.json       台词 { lines: [...] }
//
// 有台词（transcriptFile 指向的文件存在且 lines 非空）才有「学习」和「测验」；
// 没有就只有信息 + 跳转观看。

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
  /** 该句在短片里的起始时间，形如 "00:08"（mm:ss） */
  start?: string
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
  /** 系列名，如 Penelope / Alphablocks */
  series?: string
  /** 集数标题，如 "S01E01 - Getting Dressed" */
  episode?: string
  englishName: string
  chineseName: string
  durationPerEpisode: string
  ageRange: string
  producer: string
  /** 来源频道，如 "Penelope English Stories" */
  channel?: string
  /** 平台，如 YouTube / Bilibili */
  platform?: string
  description: string
  descriptionEn: string
  /** 观看地址（外链） */
  url: string
  /**
   * 台词文件相对路径（相对所在年级目录），如 'transcripts/PenelopeGettingDressed.json'。
   * 没有这个字段，或指向的文件不存在/为空 = 没有台词 = 不提供学习和测验。
   */
  transcriptFile?: string
}

export interface VideoGradeData {
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  /** 该年级的短片列表（按 series 分组展示，见 EnglishVideo.tsx） */
  items: VideoItem[]
}

/** 生字表里的一个词条 */
export interface VocabularyWord {
  /** 词形：台词里真实出现的样子（小写），如 puddles、playing */
  w: string
  /** 中文释义；空串 = 还没补 */
  zh: string
  /** 52 集里出现的总次数 */
  freq: number
  /** 例句（英文） */
  ex: string
  /** 例句（中文） */
  exZh: string
  /** 例句出自哪一集 */
  epId: number
  epName: string
  epZh: string
  /** 该词出现过的集 id 列表（用来算「本集生字」） */
  eps: number[]
}

export interface VocabularyFile {
  meta: {
    total: number
    glossed: number
    episodes: number
    updatedAt: string
  }
  words: VocabularyWord[]
}
