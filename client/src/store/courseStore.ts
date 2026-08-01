import { createContext, useContext } from 'react';
import type { Course } from '../mock/courses';
import type { Category } from '../mock/categories';

interface CourseStore {
  allCourses: Course[];
  categories: Category[];
  loaded: boolean;
  setAllCourses: (courses: Course[]) => void;
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