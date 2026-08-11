import type { LocalText } from './types';
import { getLocalText } from './types';

export interface Category {
  id: string;
  name: LocalText;
  slug: string;
}

export const mockCategories: Category[] = [
  { id: '1', name: { zh: '日常英语', en: 'Daily English' }, slug: 'daily-english' },
  { id: '2', name: { zh: '音乐', en: 'Music' }, slug: 'music' },
];

export function getCategoryName(category: Category, locale: 'zh' | 'en'): string {
  return getLocalText(category.name, locale);
}

export function getCategoryById(id: string): Category | undefined {
  return mockCategories.find(item => item.id === id);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return mockCategories.find(item => item.slug === slug);
}
