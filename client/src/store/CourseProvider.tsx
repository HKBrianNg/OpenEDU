import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { CourseContext } from './courseStore';
import { getCourses, getCategories } from '../api/courses';
import type { Course } from '../mock/courses';
import type { Category } from '../mock/categories';

interface Props {
  children: ReactNode;
}

const CourseProvider: React.FC<Props> = ({ children }) => {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) {
      Promise.all([
        getCourses(),
        getCategories(),
      ]).then(([coursesData, categoriesData]) => {
        setAllCourses(coursesData.courses);
        setCategories(categoriesData);
        setLoaded(true);
      });
    }
  }, [loaded]);

  return (
    <CourseContext.Provider value={{ allCourses, categories, loaded, setAllCourses, setCategories, setLoaded }}>
      {children}
    </CourseContext.Provider>
  );
};

export default CourseProvider;