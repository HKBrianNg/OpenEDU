import course1 from './course-1.json';
import course2 from './course-2.json';

export interface Chapter {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'article' | 'quiz';
  duration: number;
  videoUrl?: string;
  content?: string;
}

export interface CourseData {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  category: string;
  level: string;
  createdAt: string;
  tags: string[];
  chapters: Chapter[];
}

export const coursesDataMap: Record<string, CourseData> = {
  '1': course1 as CourseData,
  '2': course2 as CourseData,
};