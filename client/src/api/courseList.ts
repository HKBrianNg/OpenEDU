import { mockCategories } from '../mock/categories';
import type { Category } from '../mock/categories';
import type { CourseData } from '../mock/coursesData';
import { getAllCourses, getCourseData } from './coursesData';

export type { Category } from '../mock/categories';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getCategories(): Promise<Category[]> {
  await delay(300);
  return mockCategories;
}

export async function getCourses(params?: {
  page?: number;
  limit?: number;
  category?: string;
  level?: string;
  search?: string;
}): Promise<{ courses: CourseData[]; total: number }> {
  await delay(800);

  const allCourses = await getAllCourses();
  let filtered = [...allCourses];

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

export async function getCourseById(id: string): Promise<CourseData | null> {
  await delay(500);
  return getCourseData(id);
}