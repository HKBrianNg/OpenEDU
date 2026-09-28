import type { ComponentType } from 'react';

export interface BookEntry {
  id: string;
  title: string | ((t: (key: string) => string) => string);
  description?: string | ((t: (key: string) => string) => string);
  icon: string;
  component: ComponentType<any>;
}

class BookManager {
  private static instance: BookManager;
  private registry: Map<string, BookEntry> = new Map();

  static getInstance(): BookManager {
    if (!BookManager.instance) {
      BookManager.instance = new BookManager();
    }
    return BookManager.instance;
  }

  register(book: BookEntry): void {
    if (this.registry.has(book.id)) {
      console.warn(`[BookManager] Lab "${book.id}" is already registered.`);
    }
    this.registry.set(book.id, book);
  }

  getAll(): BookEntry[] {
    return Array.from(this.registry.values());
  }

  get(id: string): BookEntry | undefined {
    return this.registry.get(id);
  }
}

export default BookManager.getInstance();