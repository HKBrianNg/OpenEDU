import MusicManager from '../../utils/MusicManager';
import type { MusicEntry } from '../../utils/MusicManager';
import ChineseNursery from './ChineseNursery';

const ChineseNurseryEntry: MusicEntry = {
  id: 'ChineseNursery',
  title: (t: (key: string) => string) => t('music.chineseNursery.title'),
  description: (t: (key: string) => string) => t('music.chineseNursery.description'),
  icon: '🧸',
  component: ChineseNursery,
};

MusicManager.register(ChineseNurseryEntry);
