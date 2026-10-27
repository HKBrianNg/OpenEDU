// 音乐模块共享类型（中/英文歌曲页面共用）

export interface SongItem {
  name: string;
  en: string;
  /** 歌手。导入时源站没给的会写成 'Unknown'，需要手补 */
  artist?: string;
  audio: string;
  lyric: string;
}

export interface SongCategory {
  name: string;
  en: string;
  items: SongItem[];
}

export interface SongsData {
  title: string;
  titleEn: string;
  categories: SongCategory[];
}
