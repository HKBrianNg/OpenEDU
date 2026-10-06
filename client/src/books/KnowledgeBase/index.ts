// client/src/books/KnowledgeBase/index.ts

import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import KnowledgeBase from './KnowledgeBase';

const KnowledgeBaseEntry: BookEntry = {
  id: 'knowledgeBase',
  title: (t: (key: string) => string) => t('knowledgebase.title'),
  description: (t: (key: string) => string) => t('knowledgebase.description'),
  icon: '📚', // 知识库，用书本 emoji 替代 🤖
  component: KnowledgeBase,
};

BookManager.register(KnowledgeBaseEntry);

export default KnowledgeBase;