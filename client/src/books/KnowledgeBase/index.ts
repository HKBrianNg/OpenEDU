import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import KnowledgeBase from './KnowledgeBase';

const knowledgeBaseEntry: BookEntry = {
  id: 'knowledgeBase',
  title: (t: (key: string) => string) => t('book.knowledgebase.title'),
  description: (t: (key: string) => string) => t('book.knowledgebase.description'),
  icon: '🤖',
  component: KnowledgeBase,
};

BookManager.register(knowledgeBaseEntry);

export default KnowledgeBase;

