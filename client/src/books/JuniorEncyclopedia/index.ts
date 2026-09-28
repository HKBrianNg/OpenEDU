import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import JuniorEncyclopedia from './JuniorEncyclopedia';

const juniorEncyclopediaEntry: BookEntry = {
  id: 'JuniorEncyclopedia',
  title: (t: (key: string) => string) => t('book.juniorEncyclopedia.title'),
  description: (t: (key: string) => string) => t('book.juniorEncyclopedia.description'),
  icon: '🤖',
  component: JuniorEncyclopedia,
};

BookManager.register(juniorEncyclopediaEntry);

export default JuniorEncyclopedia;