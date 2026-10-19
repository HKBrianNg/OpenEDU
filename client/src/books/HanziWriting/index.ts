import BookManager from '../../utils/BookManager';
import type { BookEntry } from '../../utils/BookManager';
import HanziWriting from './HanziWriting';

const HanziWritingEntry: BookEntry = {
  id: 'hanziWriting',
  title: (t: (key: string) => string) => t('hanziwriting.title'),
  description: (t: (key: string) => string) => t('hanziwriting.description'),
  icon: '✍️',
  component: HanziWriting,
};

BookManager.register(HanziWritingEntry);

export default HanziWriting;
