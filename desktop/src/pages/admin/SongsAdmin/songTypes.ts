// desktop/src/pages/admin/SongsAdmin/songTypes.ts

export type CourseId = 'ChineseSongs' | 'EnglishSongs';

export interface SongRow {
  category: string;
  name: string;
  english: string;
  artist: string;
  audio: boolean;
  lyrics: boolean;
  audioName: string;
  lyricName: string;
}

export interface SearchSongItem {
  id: string;
  name: string;
  artist: string;
}

export interface PreviewState {
  songId: string;
  name: string;
  artist: string;
  audioUrl: string;
  duration: number;
  lyrics: string;
  category: string;
  englishName: string;
  audioMsg?: string;   // 音源解析失败原因，供预览界面提示
}

export interface SingerTag {
  name: string;
  color: string;
}

export interface SongImportModalProps {
  courseId: CourseId;           // string → CourseId（精确类型）
  open: boolean;                // visible → open（antd v6 对齐）
  onClose: () => void;
  onImported?: () => void;      // onImportSuccess → onImported（对齐父组件）
}