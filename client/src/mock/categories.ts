export interface Category {
  id: string;
  name: string | { zh: string; en: string };
  slug: string;
}

export const mockCategories: Category[] = [
  { id: '1', name: { zh: '日常英语', en: 'Daily English' }, slug: 'daily-english' },
  { id: '2', name: { zh: '后端开发', en: 'Backend Development' }, slug: 'backend' },
];