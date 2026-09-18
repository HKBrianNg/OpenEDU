export interface TocItem {
  name: string;
  en: string;
  contentLink: string;
}

export interface TocSection {
  name: string;
  en: string;
  descriptionCn: string;  // 节的中文介绍
  descriptionEn: string;  // 节的英文介绍
  items: TocItem[];
}

export interface TocChapter {
  name: string;
  en: string;
  descriptionCn: string;  // 章的中文介绍
  descriptionEn: string;  // 章的英文介绍
  sections: TocSection[];
}

export interface EncyclopediaData {
  title: string;
  titleEn: string;
  chapters: TocChapter[];
}

export interface ItemContent {
  imageLink: string;
  contentCn: string;
  contentEn: string;
}