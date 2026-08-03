import { getFullCourse, getCourseMeta } from '../mock/coursesData';
import type { CourseData } from '../mock/coursesData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 缓存已加载的完整课程数据
const courseCache: Record<string, CourseData> = {};

export async function getAllCourses(): Promise<CourseData[]> {
  // 获取所有课程的元数据（轻量）
  const courseIds = ['1', '2'];
  const courses: CourseData[] = [];

  for (const id of courseIds) {
    const meta = getCourseMeta(id);
    if (meta) {
      // 如果有缓存则直接用，否则异步加载
      if (courseCache[id]) {
        courses.push(courseCache[id]);
      } else {
        const fullCourse = await getFullCourse(id);
        if (fullCourse) {
          courseCache[id] = fullCourse;
          courses.push(fullCourse);
        }
      }
    }
  }

  return courses;
}

export async function getCourseData(id: string): Promise<CourseData | null> {
  await delay(500);

  // 优先从缓存获取
  if (courseCache[id]) {
    return courseCache[id];
  }

  // 检查是否存在该课程
  const meta = getCourseMeta(id);
  if (!meta) return null;

  // 异步加载完整数据
  const fullCourse = await getFullCourse(id);
  if (fullCourse) {
    courseCache[id] = fullCourse;
  }
  return fullCourse;
}