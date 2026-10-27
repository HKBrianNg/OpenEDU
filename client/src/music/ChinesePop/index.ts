import MusicManager from '../../utils/MusicManager';
import type { MusicEntry } from '../../utils/MusicManager';
import ChinesePop from './ChinesePop';

const ChinesePopEntry: MusicEntry = {
  id: 'ChinesePop',
  title: (t: (key: string) => string) => t('music.chinesePop.title'),
  description: (t: (key: string) => string) => t('music.chinesePop.description'),
  icon: '🎤',
  component: ChinesePop,
};

MusicManager.register(ChinesePopEntry);
