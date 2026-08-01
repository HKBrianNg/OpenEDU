import { coursesDataMap } from '../mock/coursesData';
import type { CourseData } from '../mock/coursesData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getCourseData(id: string): Promise<CourseData | null> {
  await delay(500);
  return coursesDataMap[id] || null;
}