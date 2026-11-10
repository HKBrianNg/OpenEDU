import MusicManager from '../../utils/MusicManager';
import type { MusicEntry } from '../../utils/MusicManager';
import EnglishPop from './EnglishPop';

const EnglishPopEntry: MusicEntry = {
  id: 'EnglishPop',
  title: (t: (key: string) => string) => t('music.englishPop.title'),
  description: (t: (key: string) => string) => t('music.englishPop.description'),
  icon: '🎧',
  component: EnglishPop,
};

MusicManager.register(EnglishPopEntry);
