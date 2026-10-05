import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import KnowledgeBase from './KnowledgeBase';

const KnowledgeBaseEntry: BookEntry = {
  id: 'knowledgeBase',
  title: (t: (key: string) => string) => t('knowledgebase.title'),
  description: (t: (key: string) => string) => t('knowledgebase.description'),
  icon: '🤖',
  component: KnowledgeBase,
};

BookManager.register(KnowledgeBaseEntry);

export default KnowledgeBase;

