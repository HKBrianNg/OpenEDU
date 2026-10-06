// client/src/utils/BookManager.ts
import BaseManager from './BaseManager';
import type { ManagerEntry } from './BaseManager';

export interface BookEntry extends ManagerEntry {
  // 书籍模块特有字段，按需扩展
//   author?: string;
//   pages?: number;
}

class BookManager extends BaseManager<BookEntry> {}

export default new BookManager();