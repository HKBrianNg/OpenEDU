// client/src/store/courseStore.tsx

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getAllCourseMeta } from '../CoursesData';
import type { Category } from '../categories';

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
  selectedCategoryId: string | null;
  setAllCourses: (list: CourseMetaItem[]) => void;
  setCategories: (list: Category[]) => void;
  setLoaded: (status: boolean) => void;
  setSelectedCategoryId: (id: string | null) => void;
}

const CourseContext = createContext<CourseStoreType>({
  allCourses: [],
  categories: [],
  loaded: false,
  selectedCategoryId: null,
  setAllCourses: () => {},
  setCategories: () => {},
  setLoaded: () => {},
  setSelectedCategoryId: () => {},
});

export const CourseProvider = ({ children }: { children: ReactNode }) => {
  const [allCourses, setAllCourses] = useState<CourseMetaItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  
  // 从 localStorage 恢复筛选状态
  const [selectedCategoryId, setSelectedCategoryIdState] = useState<string | null>(() => {
    return localStorage.getItem('selectedCategoryId') || null;
  });

  // 包装 setter，同步更新 localStorage
  const setSelectedCategoryId = useCallback((id: string | null) => {
    setSelectedCategoryIdState(id);
    if (id) {
      localStorage.setItem('selectedCategoryId', id);
    } else {
      localStorage.removeItem('selectedCategoryId');
    }
  }, []);

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

        // 自动提取、去重分类，使用 slug 作为唯一 id
        const categoryMap = new Map<string, Category>();
        finalCourses.forEach(course => {
          const slugStr = course.category.en.toLowerCase().replace(/\s+/g, '-');
          if (!categoryMap.has(slugStr)) {
            categoryMap.set(slugStr, {
              id: slugStr,           // 使用 slug 作为 id，与语言无关
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

  const storeValue: CourseStoreType = {
    loaded,
    allCourses,
    categories,
    selectedCategoryId,
    setAllCourses,
    setCategories,
    setLoaded,
    setSelectedCategoryId,
  };

  return (
    <CourseContext.Provider value={storeValue}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourseStore = () => useContext(CourseContext);