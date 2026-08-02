export interface Category {
  id: string;
  name: string;
  slug: string;
}

export const mockCategories: Category[] = [
  { id: '1', name: '日常英语', slug: 'Daily-English' },
  { id: '2', name: '后端开发', slug: 'backend' },
];