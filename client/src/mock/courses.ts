export interface Course {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;  // 加上这一行，问号表示可选
  price: number;
  originalPrice?: number;
  instructor: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  lessonsCount: number;
  rating: number;
  studentsCount: number;
  createdAt: string;
  tags: string[];
}

export const mockCourses: Course[] = [
  {
    id: '1',
    title: 'React 18 从入门到精通',
    description: '系统学习 React 18 核心概念，包括 Hooks、Context、Suspense 等新特性，配合实战项目巩固知识。',
    coverUrl: 'https://picsum.photos/seed/react/400/225',
    price: 199,
    originalPrice: 399,
    instructor: '张三',
    category: '前端开发',
    level: 'beginner',
    duration: 1800,
    lessonsCount: 36,
    rating: 4.8,
    studentsCount: 1280,
    createdAt: '2026-06-15',
    tags: ['React', 'Hooks', '前端'],
  },
  {
    id: '2',
    title: 'TypeScript 高级类型系统',
    description: '深入理解 TypeScript 泛型、条件类型、映射类型等高级特性，提升代码质量和开发效率。',
    coverUrl: 'https://picsum.photos/seed/typescript/400/225',
    price: 149,
    originalPrice: 299,
    instructor: '李四',
    category: '前端开发',
    level: 'intermediate',
    duration: 1200,
    lessonsCount: 24,
    rating: 4.9,
    studentsCount: 856,
    createdAt: '2026-05-20',
    tags: ['TypeScript', '类型系统'],
  },
  {
    id: '3',
    title: 'Node.js 后端开发实战',
    description: '使用 Express + PostgreSQL 构建企业级 RESTful API，涵盖认证、文件上传、部署等完整流程。',
    coverUrl: 'https://picsum.photos/seed/nodejs/400/225',
    price: 249,
    originalPrice: 499,
    instructor: '王五',
    category: '后端开发',
    level: 'intermediate',
    duration: 2400,
    lessonsCount: 48,
    rating: 4.7,
    studentsCount: 2100,
    createdAt: '2026-04-10',
    tags: ['Node.js', 'Express', 'PostgreSQL'],
  },
  {
    id: '4',
    title: 'Python 数据分析与可视化',
    description: '掌握 Pandas、NumPy、Matplotlib 等数据分析工具，从数据清洗到可视化输出全流程。',
    //coverUrl: 'https://picsum.photos/seed/python/400/225',
    coverUrl: '',
    price: 179,
    instructor: '赵六',
    category: '数据科学',
    level: 'beginner',
    duration: 1500,
    lessonsCount: 30,
    rating: 4.6,
    studentsCount: 3400,
    createdAt: '2026-03-05',
    tags: ['Python', '数据分析', 'Pandas'],
  },
  {
    id: '5',
    title: '微服务架构设计与实践',
    description: '学习微服务拆分原则、服务通信、分布式事务、容器化部署等核心知识。',
    coverUrl: '/images/a.jpg',
    price: 299,
    originalPrice: 599,
    instructor: '钱七',
    category: '架构设计',
    level: 'advanced',
    duration: 3600,
    lessonsCount: 60,
    rating: 4.9,
    studentsCount: 560,
    createdAt: '2026-02-18',
    tags: ['微服务', 'Docker', '分布式'],
  },
  {
    id: '6',
    title: 'CSS 动画与交互设计',
    description: '从基础 transition 到复杂 keyframe 动画，打造流畅的用户交互体验。',
    coverUrl: 'https://picsum.photos/seed/css/400/225',
    price: 99,
    instructor: '孙八',
    category: '前端开发',
    level: 'beginner',
    duration: 600,
    lessonsCount: 12,
    rating: 4.5,
    studentsCount: 4200,
    createdAt: '2026-01-22',
    tags: ['CSS', '动画', '交互'],
  },
];