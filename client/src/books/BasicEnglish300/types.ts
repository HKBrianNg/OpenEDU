export interface LessonItem {
  name: string;
  en: string;
  lessonImage: string;
}

export interface Chapter {
  name: string;
  en: string;
  lessonsFile?: string;
  items: LessonItem[];
}

export interface BasicEnglishData {
  title: string;
  titleEn: string;
  chapters: Chapter[];
}