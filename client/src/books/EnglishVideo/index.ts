// client/src/books/EnglishVideo/index.ts

import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import EnglishVideo from './EnglishVideo';

const englishVideoEntry: BookEntry = {
  id: 'EnglishVideo',
  title: (t: (key: string) => string) => t('englishVideo.title'),
  description: (t: (key: string) => string) => t('englishVideo.description'),
  icon: '🎬',
  component: EnglishVideo,
};

BookManager.register(englishVideoEntry);

export default EnglishVideo;
