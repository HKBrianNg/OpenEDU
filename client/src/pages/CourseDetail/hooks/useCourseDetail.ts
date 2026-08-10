import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLocale } from '../../../store/LocaleContext';
import { getCourseData } from '../../../api/coursesData';
import type { CourseData, Lesson } from '../../../mock/coursesData';

export function useCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();

  // 全部状态迁移至此
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [blurContent, setBlurContent] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    return localStorage.getItem('autoSpeak') === 'true';
  });

  // 所有事件处理函数
  const handleAutoSpeakChange = (checked: boolean) => {
    setAutoSpeak(checked);
    localStorage.setItem('autoSpeak', String(checked));
  };

  const handleLessonClick = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    if (isMobile) setSidebarDrawerOpen(false);
  };

  const toggleAllChapterExpand = () => {
    if (!course) return;
    const allChapterIds = course.chapters.map(ch => ch.id);
    if (expandedChapters.length === allChapterIds.length) {
      setExpandedChapters([]);
    } else {
      setExpandedChapters(allChapterIds);
    }
  };

  // 窗口尺寸监听副作用
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
        setSidebarDrawerOpen(false);
      } else {
        setShowSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 课程数据请求副作用
  useEffect(() => {
    if (!id) return;
    getCourseData(id).then(data => {
      setCourse(data);
      setLoading(false);
      if (data?.chapters.length) {
        setExpandedChapters([data.chapters[0].id]);
        setCurrentLesson(data.chapters[0].lessons[0]);
      }
    });
  }, [id]);

  // 页面销毁清空语音
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // 统一导出页面需要的全部变量、方法
  return {
    // 状态
    course,
    loading,
    currentLesson,
    expandedChapters,
    showSidebar,
    sidebarDrawerOpen,
    blurContent,
    isMobile,
    autoSpeak,
    // 多语言路由
    t,
    locale,
    // setters
    setBlurContent,
    setExpandedChapters,
    setShowSidebar,
    setSidebarDrawerOpen,
    // 事件函数
    handleAutoSpeakChange,
    handleLessonClick,
    toggleAllChapterExpand,
  };
}
