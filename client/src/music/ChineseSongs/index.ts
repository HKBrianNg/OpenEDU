// client/src/music/ChineseSongs/index.ts

import MusicManager from '../../utils/MusicManager';
import type { MusicEntry } from '../../utils/MusicManager';
import ChineseSongs from './ChineseSongs';

const ChineseSongsEntry: MusicEntry = {
  id: 'ChineseSongs',
  title: (t: (key: string) => string) => t('music.chinesesongs.title'),
  description: (t: (key: string) => string) => t('music.chinesesongs.description'),
  icon: '🎵', // 音乐相关，用音符 emoji 替代 🤖
  component: ChineseSongs,
};

MusicManager.register(ChineseSongsEntry);

export default ChineseSongs;