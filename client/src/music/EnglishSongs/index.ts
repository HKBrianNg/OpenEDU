import MusicManager from '../../utils/MusicManager'
import type { MusicEntry } from '../../utils/MusicManager';
import EnglishSongs from './EnglishSongs';

const EnglishSongsEntry: MusicEntry = {
  id: 'EnglishSongs',
  title: (t: (key: string) => string) => t('music.englishsongs.title'),
  description: (t: (key: string) => string) => t('music.englishsongs.description'),
  icon: '🤖',
  component: EnglishSongs,
};

MusicManager.register(EnglishSongsEntry);

export default EnglishSongs;