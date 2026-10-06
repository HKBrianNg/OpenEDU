// client/src/books/BasicEnglish300/index.ts

import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import BasicEnglish300 from './BasicEnglish300';

const basicEnglish300Entry: BookEntry = {
  id: 'BasicEnglish300',
  title: (t: (key: string) => string) => t('basicEnglish300.title'),
  description: (t: (key: string) => string) => t('basicEnglish300.description'),
  icon: '🔠', // 基础英语，用字母方块 emoji 替代 🤖
  component: BasicEnglish300,
};

BookManager.register(basicEnglish300Entry);

export default BasicEnglish300;