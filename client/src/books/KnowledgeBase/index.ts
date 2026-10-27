// client/src/books/KnowledgeBase/index.ts

import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import KnowledgeBase from './KnowledgeBase';

const KnowledgeBaseEntry: BookEntry = {
  id: 'knowledgeBase',
  title: (t: (key: string) => string) => t('knowledgebase.title'),
  description: (t: (key: string) => string) => t('knowledgebase.description'),
  icon: '📚', // 知识库，用书本 emoji 替代 🤖
  category: 'science', // 归到「科学」，不在 /books 里出现
  component: KnowledgeBase,
};

BookManager.register(KnowledgeBaseEntry);

export default KnowledgeBase;