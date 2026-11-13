export interface KnowledgeChapter {
  name: string;
  en: string;
  contentLink: string;
}

export interface KnowledgeItem {
  title: {
    zh: string;
    en: string;
  };
  content: {
    zh: string;
    en: string;
  };
  imageUrl?: string;
}

export interface KnowledgeIndex {
  title: string;
  titleEn: string;
  chapters: KnowledgeChapter[];
}
