import course1Meta from './course-1/course-1.json';
import course2Meta from './course-2/course-2.json';

// CDN 基础路径，从环境变量读取，带兜底值
const CDN_BASE = import.meta.env.VITE_CDN_BASE || 'https://cdn.jsdelivr.net/gh/HKBrianNg/img-library@main'

// 定义 Lesson 接口
export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'article' | 'quiz';
  lessonUrl: string;
  content?: string;
}

// 定义 JSON 模块的类型：默认导出一个 Lesson 数组
type JsonModule = { default: Lesson[] };

// 使用 import.meta.glob 预加载所有 lessons 文件（非 eager 模式，按需加载）
const lessonsModules = import.meta.glob<JsonModule>('./course-*/**/*.json');

const coursesMetaMap: Record<string, any> = {
  '1': course1Meta,
  '2': course2Meta,
};

export interface Chapter {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
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

// 工具函数：将 lesson 的本地图片路径转为 CDN 完整路径
function transformLessonUrl(lesson: Lesson, courseId: string): Lesson {
  if (lesson.type === 'article' && lesson.lessonUrl) {
    const fileName = lesson.lessonUrl.split('/').pop()
    return {
      ...lesson,
      lessonUrl: `${CDN_BASE}/openEDU/course-${courseId}/images/${fileName}`
    }
  }
  return lesson
}

// 工具函数：将 coverUrl 转为 CDN 完整路径
function transformCoverUrl(coverUrl: string, courseId: string): string {
  if (!coverUrl) {
    return `${CDN_BASE}/openEDU/public/default-course.svg`
  }
  const fileName = coverUrl.split('/').pop()
  if (!fileName) {
    return `${CDN_BASE}/openEDU/public/default-course.svg`
  }
  return `${CDN_BASE}/openEDU/course-${courseId}/images/${fileName}`
}

// 获取课程基本信息（不含 lessons）
export function getCourseMeta(courseId: string): Omit<CourseData, 'chapters'> & { chapters: Omit<Chapter, 'lessons'>[] } | null {
  const meta = coursesMetaMap[courseId];
  if (!meta) return null;

  return {
    id: meta.id,
    title: meta.title,
    description: meta.description,
    coverUrl: transformCoverUrl(meta.coverUrl, courseId),  // 转换封面图 URL
    category: meta.category,
    level: meta.level,
    createdAt: meta.createdAt,
    tags: meta.tags,
    chapters: meta.chapters.map((ch: any) => ({
      id: ch.id,
      title: ch.title,
      order: ch.order,
    })),
  };
}

// 根据课程ID和章节ID异步加载该章节的 lessons
export async function getChapterLessons(courseId: string, chapterId: string): Promise<Lesson[]> {
  const meta = coursesMetaMap[courseId];
  if (!meta) return [];

  const chapter = meta.chapters.find((ch: any) => ch.id === chapterId);
  if (!chapter || !chapter.lessonsFile) return [];

  try {
    const modulePath = `./course-${courseId}/${chapter.lessonsFile}`;
    const loader = lessonsModules[modulePath];
    if (!loader) {
      console.error(`Module not found: ${modulePath}`);
      return [];
    }
    const lessonsModule = await loader();
    return lessonsModule.default.map(lesson => transformLessonUrl(lesson, courseId));
  } catch (e) {
    console.error(`Failed to load lessons for ${courseId}/${chapter.lessonsFile}`, e);
    return [];
  }
}

// 异步加载完整课程数据
export async function getFullCourse(courseId: string): Promise<CourseData | null> {
  const meta = coursesMetaMap[courseId];
  if (!meta) return null;

  const chapters: Chapter[] = [];
  for (const ch of meta.chapters) {
    const lessons = ch.lessonsFile ? await getChapterLessons(courseId, ch.id) : [];
    chapters.push({
      id: ch.id,
      title: ch.title,
      order: ch.order,
      lessons,
    });
  }

  return {
    id: meta.id,
    title: meta.title,
    description: meta.description,
    coverUrl: transformCoverUrl(meta.coverUrl, courseId),  // 转换封面图 URL
    category: meta.category,
    level: meta.level,
    createdAt: meta.createdAt,
    tags: meta.tags,
    chapters,
  };
}