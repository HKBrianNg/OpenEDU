import MusicManager from '../../utils/MusicManager';
import type { MusicEntry } from '../../utils/MusicManager';
import EnglishNursery from './EnglishNursery';

const EnglishNurseryEntry: MusicEntry = {
  id: 'EnglishNursery',
  title: (t: (key: string) => string) => t('music.englishNursery.title'),
  description: (t: (key: string) => string) => t('music.englishNursery.description'),
  icon: '🐣',
  component: EnglishNursery,
};

MusicManager.register(EnglishNurseryEntry);
