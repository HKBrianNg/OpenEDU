export interface Category {
  id: string;
  name: string;
  slug: string;
}

export const mockCategories: Category[] = [
  { id: '1', name: '前端开发', slug: 'frontend' },
  { id: '2', name: '后端开发', slug: 'backend' },
  { id: '3', name: '数据科学', slug: 'data-science' },
  { id: '4', name: '架构设计', slug: 'architecture' },
];