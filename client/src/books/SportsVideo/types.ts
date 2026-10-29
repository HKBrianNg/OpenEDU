// client/src/books/SportsVideo/types.ts
//
// 体育短片的数据形状。对应 public/data/SportsVideo/：
//   data.json                索引（项目列表：高尔夫、篮球……）
//   {Sport}/{Sport}.json     项目内容 { title, titleEn, description, items: [...] }
//
// 比 EnglishVideo 的 VideoItem 少很多字段：这里没有台词、没有学习/测验、没有生字表，
// 就是「看动作」。时长也没记 —— Shorts 都是几十秒，写个假的还不如不写。

export interface SportChapter {
  name: string
  en: string
  contentLink: string
}

export interface SportIndexData {
  title: string
  titleEn: string
  description?: string
  descriptionEn?: string
  chapters: SportChapter[]
}

export interface SportItem {
  id: number
  englishName: string
  chineseName: string
  /** 来源频道 */
  channel?: string
  /** 平台，如 YouTube */
  platform?: string
  /** 单集时长，形如 "4:01"。有就显示，没有就不显示（不编） */
  durationPerEpisode?: string
  description: string
  descriptionEn: string
  /** 观看地址（外链） */
  url: string
}

export interface SportCategoryData {
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  items: SportItem[]
}
