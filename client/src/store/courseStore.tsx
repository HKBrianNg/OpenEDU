// client/src/store/courseStore.tsx

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getAllCourseMeta } from '../CoursesData';
import type { Category } from '../categories';

// 直接定义课程元数据类型，避免复杂泛型推导导致的索引错误
interface CourseMetaItem {
  id: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
  coverUrl: string;
  category: { zh: string; en: string };
  level: { zh: string; en: string };
  createdAt: string;
  tags: string[];
  chapters: Array<{ id: string; title: string; order: number }>;
}

interface CourseStoreType {
  allCourses: CourseMetaItem[];
  categories: Category[];
  loaded: boolean;
  setAllCourses: (list: CourseMetaItem[]) => void;
  setCategories: (list: Category[]) => void;
  setLoaded: (status: boolean) => void;
}

// 创建上下文默认值
const CourseContext = createContext<CourseStoreType>({
  allCourses: [],
  categories: [],
  loaded: false,
  setAllCourses: () => {},
  setCategories: () => {},
  setLoaded: () => {},
});

export const CourseProvider = ({ children }: { children: ReactNode }) => {
  const [allCourses, setAllCourses] = useState<CourseMetaItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (loaded) return;

    const loadData = async () => {
      try {
        const mockCourseList = await getAllCourseMeta();
        console.log("【调试】本地mock课程列表 mockCourseList =", mockCourseList);

        const finalCourses = mockCourseList.map((rawCourse: CourseMetaItem) => {
          const matchedMock = mockCourseList.find((item: CourseMetaItem) => item.id === rawCourse.id);
          console.log(`【调试】原始课程id: ${rawCourse.id} 匹配到mock:`, matchedMock);
          
          return {
            ...rawCourse,
            coverUrl: matchedMock?.coverUrl || "/images/default-course.svg"
          };
        });

        console.log("【调试】处理完成存入仓库 finalCourses =", finalCourses);
        setAllCourses(finalCourses);

        // 自动提取、去重分类，补齐 Category 所需 slug 字段
        const categoryMap = new Map<string, Category>();
        finalCourses.forEach(course => {
          const catKey = JSON.stringify(course.category);
          if (!categoryMap.has(catKey)) {
            const slugStr = course.category.en.toLowerCase().replace(/\s+/g, '-');
            categoryMap.set(catKey, {
              id: catKey,
              slug: slugStr,
              name: course.category
            });
          }
        });
        const uniqueCategories = Array.from(categoryMap.values());
        setCategories(uniqueCategories);

        setLoaded(true);
      } catch (error) {
        console.error('加载课程列表失败:', error);
      }
    };

    loadData();
  }, [loaded]);

  // 全局仓库导出值
  const storeValue: CourseStoreType = {
    loaded,
    allCourses,
    categories,
    setAllCourses,
    setCategories,
    setLoaded,
  };

  return (
    <CourseContext.Provider value={storeValue}>
      {children}
    </CourseContext.Provider>
  );
};

// 全局获取仓库Hook
export const useCourseStore = () => useContext(CourseContext);