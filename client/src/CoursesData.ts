// client/src/CoursesData.ts

import type { LocalText } from './types';
import { getLocalText } from './types';

const CDN_BASE = import.meta.env.VITE_CDN_BASE || 'https://cdn.jsdelivr.net/gh/HKBrianNg/img-library@main';
const ROOT_SUB_DIR = 'openEDU';
const DATA_VERSION = import.meta.env.VITE_DATA_VERSION || '1';

// 新增：是否使用本地数据（开发环境通过环境变量控制）
const USE_LOCAL_DATA = import.meta.env.VITE_USE_LOCAL_DATA === 'true';

/**
 * 为 URL 附加版本号参数，用于强制刷新 CDN 缓存
 */
function addVersion(url: string): string {
  if (USE_LOCAL_DATA) return url; // 本地模式不加版本号
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${DATA_VERSION}`;
}

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

/** 清洗路径首尾斜杠 */
function cleanPathSegment(str: string): string {
  return str.replace(/^\/+|\/+$/g, '');
}

/** 构建 CDN 基础 URL */
function buildCdnBaseUrl(courseId: string): string {
  return [
    cleanPathSegment(CDN_BASE),
    cleanPathSegment(ROOT_SUB_DIR),
    `course-${courseId}`
  ].filter(Boolean).join('/');
}

/** 构建本地基础 URL（通过软链接 public/data -> openEDU） */
function buildLocalBaseUrl(courseId: string): string {
  return `/data/course-${courseId}`;
}

/** 根据模式获取当前基础 URL */
function getBaseUrl(courseId: string): string {
  return USE_LOCAL_DATA ? buildLocalBaseUrl(courseId) : buildCdnBaseUrl(courseId);
}

/** 转换 Lesson 资源地址为完整链接（支持本地/CDN） */
function transformLessonUrl(lesson: Lesson, courseId: string): Lesson {
  const result = { ...lesson };
  const basePrefix = getBaseUrl(courseId);

  if (result.type === 'article' && result.lessonUrl) {
    const fileName = result.lessonUrl.split('/').pop();
    result.lessonUrl = `${basePrefix}/images/${fileName}`;
  }

  if (result.type === 'audio') {
    if (result.lessonUrl) {
      const fileName = result.lessonUrl.split('/').pop();
      result.lessonUrl = `${basePrefix}/audio/${fileName}`;
    }
    if (result.content) {
      const lyricFileName = result.content.split('/').pop();
      result.content = `${basePrefix}/lyric/${lyricFileName}`;
    }
    if (result.lyric) {
      const fileName = result.lyric.split('/').pop();
      result.lyric = `${basePrefix}/lyric/${fileName}`;
    }
  }

  return result;
}

/** 转换课程封面地址 */
function transformCoverUrl(coverUrl: string, courseId: string): string {
  const basePrefix = getBaseUrl(courseId);
  if (!coverUrl) {
    return `${getBaseUrl('public')}/default-course.svg`;
  }
  const fileName = coverUrl.split('/').pop();
  if (!fileName) {
    return `${getBaseUrl('public')}/default-course.svg`;
  }
  return `${basePrefix}/images/${fileName}`;
}

/**
 * 从 CDN 或本地加载课程元数据（不含章节课时）
 */
export async function getCourseMeta(courseId: string): Promise<Omit<CourseData, 'chapters'> & {
  chapters: Array<Omit<Chapter, 'lessons'>>;
} | null> {
  try {
    const baseUrl = getBaseUrl(courseId);
    const url = addVersion(`${baseUrl}/course-${courseId}.json`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const meta = await res.json();

    return {
      id: meta.id,
      title: meta.title,
      description: meta.description,
      coverUrl: transformCoverUrl(meta.coverUrl, courseId),
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
  } catch (err) {
    console.error(`加载课程元数据失败: ${courseId}`, err);
    return null;
  }
}

/**
 * 获取所有课程元数据（首页列表）
 */
export async function getAllCourseMeta(): Promise<Array<Omit<CourseData, 'chapters'> & {
  chapters: Array<Omit<Chapter, 'lessons'>>;
}>> {
  const knownIds = ['1', '2', '3'];
  const results = await Promise.all(knownIds.map(id => getCourseMeta(id)));
  return results.filter(Boolean) as any[];
}

/**
 * 按需加载单个章节课时（带缓存）
 */
export async function getChapterLessons(courseId: string, chapterId: string): Promise<Lesson[]> {
  const cacheKey = `${courseId}-${chapterId}`;
  if (chapterCache.has(cacheKey)) return chapterCache.get(cacheKey)!;

  try {
    // 先获取元数据以得知 lessonsFile 名称
    const baseUrl = getBaseUrl(courseId);
    const metaUrl = addVersion(`${baseUrl}/course-${courseId}.json`);
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) return [];
    const meta = await metaRes.json();
    const chapter = meta.chapters.find((ch: any) => ch.id === chapterId);
    if (!chapter?.lessonsFile) return [];

    // 加载章节文件
    const lessonsUrl = addVersion(`${baseUrl}/${chapter.lessonsFile}`);
    const lessonsRes = await fetch(lessonsUrl);
    if (!lessonsRes.ok) return [];
    const rawLessons: Lesson[] = await lessonsRes.json();

    const processed = rawLessons.map(l => transformLessonUrl(l, courseId));
    chapterCache.set(cacheKey, processed);
    return processed;
  } catch (err) {
    console.error(`加载章节失败: ${courseId}/${chapterId}`, err);
    return [];
  }
}

/**
 * 加载完整课程，包含所有章节课时
 */
export async function getFullCourse(courseId: string): Promise<CourseData | null> {
  const meta = await getCourseMeta(courseId);
  if (!meta) return null;

  const chapters: Chapter[] = [];
  for (const ch of meta.chapters) {
    const lessons = await getChapterLessons(courseId, ch.id);
    chapters.push({ ...ch, lessons });
  }

  return { ...meta, chapters };
}

// 导出全局双语工具
export { getLocalText };