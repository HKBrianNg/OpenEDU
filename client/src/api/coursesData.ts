// 替换@mock为相对路径 ../mock
import { getFullCourse, getAllCourseMeta } from '../mock/coursesData';
import type { CourseData } from '../mock/coursesData';

// 模拟接口请求延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API层全局完整课程缓存
const courseCache: Record<string, CourseData> = {};

/**
 * 获取全部完整课程数据（包含所有章节、课时，自带缓存）
 */
export async function getAllCourses(): Promise<CourseData[]> {
  // 动态读取所有课程元数据，自动适配新增课程
  const allCourseMetaList = getAllCourseMeta();
  const courses: CourseData[] = [];

  for (const meta of allCourseMetaList) {
    const courseId = meta.id;
    // 优先读取缓存，避免重复请求
    if (courseCache[courseId]) {
      courses.push(courseCache[courseId]);
      continue;
    }
    // 加载完整课程结构（含章节课时）
    const fullCourse = await getFullCourse(courseId);
    if (fullCourse) {
      courseCache[courseId] = fullCourse;
      courses.push(fullCourse);
    }
  }
  return courses;
}

/**
 * 根据课程ID获取完整课程详情
 * @param id 课程唯一标识
 */
export async function getCourseData(id: string): Promise<CourseData | null> {
  await delay(500);
  // 命中缓存直接返回
  if (courseCache[id]) {
    return courseCache[id];
  }

  // 请求完整课程数据
  const fullCourse = await getFullCourse(id);
  if (fullCourse) {
    courseCache[id] = fullCourse;
  }
  return fullCourse;
}

/**
 * 清空课程缓存
 * 使用场景：切换语言、刷新页面时清空缓存，重新加载双语数据
 */
export function clearCourseCache() {
  Object.keys(courseCache).forEach(key => delete courseCache[key]);
}
