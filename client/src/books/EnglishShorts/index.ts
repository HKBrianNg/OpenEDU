// client/src/books/EnglishShorts/index.ts

import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import EnglishShorts from './EnglishShorts';

const englishShortsEntry: BookEntry = {
  id: 'EnglishShorts',
  title: (t: (key: string) => string) => t('englishShorts.title'),
  description: (t: (key: string) => string) => t('englishShorts.description'),
  icon: '💬',
  component: EnglishShorts,
};

BookManager.register(englishShortsEntry);

export default EnglishShorts;
