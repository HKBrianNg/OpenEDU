// client/src/books/EnglishVideo/index.ts

import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import EnglishVideo from './EnglishVideo';

const englishVideoEntry: BookEntry = {
  id: 'EnglishVideo',
  title: (t: (key: string) => string) => t('englishVideo.title'),
  description: (t: (key: string) => string) => t('englishVideo.description'),
  icon: '🎬',
  category: 'english', // 归到「英文」，不在 /books 里出现
  component: EnglishVideo,
};

BookManager.register(englishVideoEntry);

export default EnglishVideo;
