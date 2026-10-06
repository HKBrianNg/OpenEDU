// client/src/books/JuniorEncyclopedia/index.ts

import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import JuniorEncyclopedia from './JuniorEncyclopedia';

const juniorEncyclopediaEntry: BookEntry = {
  id: 'JuniorEncyclopedia',
  title: (t: (key: string) => string) => t('juniorEncyclopedia.title'),
  description: (t: (key: string) => string) => t('juniorEncyclopedia.description'),
  icon: '🌍', // 百科，用地球 emoji 替代 🤖
  component: JuniorEncyclopedia,
};

BookManager.register(juniorEncyclopediaEntry);

export default JuniorEncyclopedia;