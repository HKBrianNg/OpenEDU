import { mockCourses } from '../mock/courses';
import { mockCategories } from '../mock/categories';
import type { Category } from '../mock/categories';

// 直接在这里定义 Course 类型
export interface Course {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  price: number;
  originalPrice?: number;
  instructor: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  lessonsCount: number;
  rating: number;
  studentsCount: number;
  createdAt: string;
  tags: string[];
}

export type { Category } from '../mock/categories';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 获取分类
export async function getCategories(): Promise<Category[]> {
  await delay(300);
  return mockCategories;
}

// 获取课程
export async function getCourses(params?: {
  page?: number;
  limit?: number;
  category?: string;
  level?: string;
  search?: string;
}): Promise<{ courses: Course[]; total: number }> {
  await delay(800);

  let filtered = [...mockCourses];

  if (params?.category) {
    filtered = filtered.filter(c => c.category === params.category);
  }
  if (params?.level) {
    filtered = filtered.filter(c => c.level === params.level);
  }
  if (params?.search) {
    const keyword = params.search.toLowerCase();
    filtered = filtered.filter(
      c =>
        c.title.toLowerCase().includes(keyword) ||
        c.description.toLowerCase().includes(keyword) ||
        c.tags.some((t: string) => t.toLowerCase().includes(keyword))
    );
  }

  const total = filtered.length;
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const start = (page - 1) * limit;
  const courses = filtered.slice(start, start + limit);

  return { courses, total };
}

export async function getCourseById(id: string): Promise<Course | null> {
  await delay(500);
  return mockCourses.find(c => c.id === id) || null;
}