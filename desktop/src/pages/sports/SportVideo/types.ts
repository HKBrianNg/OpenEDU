// desktop/src/pages/SportVideo/types.ts
export interface SportItem {
  id: number;
  chineseName: string;
  englishName: string;
  description: string;
  descriptionEn: string;
  channel: string;
  platform: string;
  durationPerEpisode: string;
  url: string;
}

export interface SportCategoryData {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  items: SportItem[];
}

export interface SportChapter {
  name: string;
  en: string;
  contentLink: string;
}

export interface SportIndexData {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  chapters: SportChapter[];
}
