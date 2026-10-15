// client/src/utils/BookManager.ts
import BaseManager from './BaseManager';
import type { ManagerEntry } from './BaseManager';

// 书籍模块特有字段，按需扩展（暂时和 ManagerEntry 同形）
export type BookEntry = ManagerEntry

class BookManager extends BaseManager<BookEntry> {}

export default new BookManager();