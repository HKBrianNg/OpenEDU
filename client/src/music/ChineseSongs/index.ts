import MusicManager from '../../utils/MusicManager'
import type { MusicEntry } from '../../utils/MusicManager';
import ChineseSongs from './ChineseSongs';

const ChineseSongsEntry: MusicEntry = {
  id: 'ChineseSongs',
  title: (t: (key: string) => string) => t('music.chinesesongs.title'),
  description: (t: (key: string) => string) => t('music.chinesesongs.description'),
  icon: '🤖',
  component: ChineseSongs,
};

MusicManager.register(ChineseSongsEntry);

export default ChineseSongs;