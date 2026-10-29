// client/src/books/SportsVideo/index.ts

import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import SportsVideo from './SportsVideo';

const sportsVideoEntry: BookEntry = {
  id: 'SportsVideo',
  title: (t: (key: string) => string) => t('sportsVideo.title'),
  description: (t: (key: string) => string) => t('sportsVideo.description'),
  icon: '🏅',
  category: 'sports', // 归到「体育」，出现在 /sports
  order: 1, // /sports 里目前就这一本，写死顺序免得以后加书时位置乱跳
  component: SportsVideo,
};

BookManager.register(sportsVideoEntry);

export default SportsVideo;
