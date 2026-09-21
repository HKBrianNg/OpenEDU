import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import EnglishWord from './EnglishWord';

const EnglishWordEntry: BookEntry = {
  id: 'EnglishWord',
  title: (t: (key: string) => string) => t('book.englishword.title'),
  description: (t: (key: string) => string) => t('book.englishword.description'),
  icon: '🤖',
  component: EnglishWord,
};

BookManager.register(EnglishWordEntry);

export default EnglishWord;

