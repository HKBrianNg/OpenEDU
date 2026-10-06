// client/src/utils/BookManager.ts
import BaseManager from './BaseManager';
import type { ManagerEntry } from './BaseManager';

class BookManager extends BaseManager<ManagerEntry> {}

export default new BookManager();