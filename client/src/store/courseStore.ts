import { createContext, useContext } from 'react';
import type { CourseData } from '../mock/coursesData';
import type { Category } from '../mock/categories';

interface CourseStore {
  allCourses: CourseData[];
  categories: Category[];
  loaded: boolean;
  setAllCourses: (courses: CourseData[]) => void;
  setCategories: (categories: Category[]) => void;
  setLoaded: (loaded: boolean) => void;
}

export const CourseContext = createContext<CourseStore>({
  allCourses: [],
  categories: [],
  loaded: false,
  setAllCourses: () => {},
  setCategories: () => {},
  setLoaded: () => {},
});

export const useCourseStore = () => useContext(CourseContext);