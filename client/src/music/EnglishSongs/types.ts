export interface SongItem {
  name: string;
  en: string;
  audio: string;
  lyric: string;
}

export interface Category {
  name: string;
  en: string;
  items: SongItem[];
}

export interface EnglishSongsData {
  title: string;
  titleEn: string;
  categories: Category[];
}