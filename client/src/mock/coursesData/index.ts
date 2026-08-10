import course1Meta from './course-1/course-1.json';
import course2Meta from './course-2/course-2.json';

import type { LocalText } from '../types';
import { getLocalText } from '../types';

// 开发/测试/生产 全部统一使用CDN地址，移除DEV环境特殊空路径
const CDN_BASE = import.meta.env.VITE_CDN_BASE || 'https://cdn.jsdelivr.net/gh/HKBrianNg/img-library@main';
// 固定仓库一级目录
const ROOT_SUB_DIR = 'openEDU';

// 章节数据缓存，避免重复加载
const chapterCache = new Map<string, Lesson[]>();

export interface Lesson {
  id: string;
  title: string;
  type: 'audio' | 'video' | 'article' | 'quiz';
  lessonUrl: string;
  content?: string;
  lyric?: string;
}

type JsonModule = { default: Lesson[] };
const lessonsModules = import.meta.glob<JsonModule>('./course-*/**/*.json');

// 课程元数据完整类型（对齐json结构）
interface RawCourseMeta {
  id: string;
  title: LocalText;
  description: LocalText;
  coverUrl: string;
  category: LocalText;
  level: LocalText;
  createdAt: string;
  tags: string[];
  chapters: Array<{
    id: string;
    title: string;
    order: number;
    lessonsFile: string;
  }>;
}

const coursesMetaMap: Record<string, RawCourseMeta> = {
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
  title: LocalText;
  description: LocalText;
  coverUrl: string;
  category: LocalText;
  level: LocalText;
  createdAt: string;
  tags: string[];
  chapters: Chapter[];
}

export type Course = CourseData;

/**
 * 清洗路径首尾斜杠，避免拼接出现 //
 */
function cleanPathSegment(str: string): string {
  return str.replace(/^\/+|\/+$/g, '');
}

/**
 * 转换Lesson资源地址为CDN完整链接
 * 修复：歌词目录为 lyric（单数，移除多余s），匹配仓库真实文件夹
 */
function transformLessonUrl(lesson: Lesson, courseId: string): Lesson {
  const result = { ...lesson };
  const basePrefix = [
    cleanPathSegment(CDN_BASE),
    cleanPathSegment(ROOT_SUB_DIR),
    cleanPathSegment(`course-${courseId}`)
  ].filter(Boolean).join('/');

  if (result.type === 'article' && result.lessonUrl) {
    const fileName = result.lessonUrl.split('/').pop();
    result.lessonUrl = `${basePrefix}/images/${fileName}`;
  }

  if (result.type === 'audio' && result.lessonUrl) {
    const fileName = result.lessonUrl.split('/').pop();
    result.lessonUrl = `${basePrefix}/audio/${fileName}`;
    // 核心修复：目录改为 lyric（单数，无s）
    if (result.content) {
      const lyricFileName = result.content.split('/').pop();
      result.content = `${basePrefix}/lyric/${lyricFileName}`;
    }
  }

  // 兼容lyric字段，同步使用 lyric 单数目录
  if (result.lyric) {
    const fileName = result.lyric.split('/').pop();
    result.lyric = `${basePrefix}/lyric/${fileName}`;
  }

  return result;
}

/**
 * 转换课程封面地址，无图统一返回CDN兜底默认封面
 */
function transformCoverUrl(coverUrl: string, courseId: string): string {
  const basePrefix = [
    cleanPathSegment(CDN_BASE),
    cleanPathSegment(ROOT_SUB_DIR),
    cleanPathSegment(`course-${courseId}`)
  ].filter(Boolean).join('/');

  // 空封面统一CDN公共兜底图
  if (!coverUrl) {
    return `${[cleanPathSegment(CDN_BASE), cleanPathSegment(ROOT_SUB_DIR), 'public'].filter(Boolean).join('/')}/default-course.svg`;
  }

  const fileName = coverUrl.split('/').pop();
  if (!fileName) {
    return `${[cleanPathSegment(CDN_BASE), cleanPathSegment(ROOT_SUB_DIR), 'public'].filter(Boolean).join('/')}/default-course.svg`;
  }

  return `${basePrefix}/images/${fileName}`;
}

/**
 * 获取单课程基础元数据（无章节课时，适合列表页）
 */
export function getCourseMeta(courseId: string): Omit<CourseData, 'chapters'> & {
  chapters: Array<Omit<Chapter, 'lessons'>>;
} | null {
  const meta = coursesMetaMap[courseId];
  if (!meta) return null;

  return {
    id: meta.id,
    title: meta.title,
    description: meta.description,
    coverUrl: transformCoverUrl(meta.coverUrl, courseId),
    category: meta.category,
    level: meta.level,
    createdAt: meta.createdAt,
    tags: meta.tags,
    chapters: meta.chapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      order: ch.order,
    })),
  };
}

/**
 * 获取全部课程基础元数据（首页课程列表专用）
 */
export function getAllCourseMeta(): Array<Omit<CourseData, 'chapters'> & {
  chapters: Array<Omit<Chapter, 'lessons'>>;
}> {
  return Object.values(coursesMetaMap).map(meta => getCourseMeta(meta.id)!);
}

/**
 * 按需加载单个章节课时（带缓存）
 */
export async function getChapterLessons(courseId: string, chapterId: string): Promise<Lesson[]> {
  const cacheKey = `${courseId}-${chapterId}`;
  if (chapterCache.has(cacheKey)) return chapterCache.get(cacheKey)!;

  const meta = coursesMetaMap[courseId];
  if (!meta) return [];

  const targetChapter = meta.chapters.find(ch => ch.id === chapterId);
  if (!targetChapter?.lessonsFile) return [];

  const modulePath = `./course-${courseId}/${targetChapter.lessonsFile}`;
  const loader = lessonsModules[modulePath];
  if (!loader) {
    console.error(`[Mock] 未找到章节文件: ${modulePath}`);
    return [];
  }

  try {
    const module = await loader();
    const processedLessons = module.default.map(item => transformLessonUrl(item, courseId));
    chapterCache.set(cacheKey, processedLessons);
    return processedLessons;
  } catch (err) {
    console.error(`[Mock] 加载章节失败 ${modulePath}:`, err);
    return [];
  }
}

/**
 * 加载完整课程，包含所有章节课时
 */
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
    coverUrl: transformCoverUrl(meta.coverUrl, courseId),
    category: meta.category,
    level: meta.level,
    createdAt: meta.createdAt,
    tags: meta.tags,
    chapters,
  };
}

// 导出全局双语工具，统一项目取值
export { getLocalText };
