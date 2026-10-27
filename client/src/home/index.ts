// client/src/home/index.ts
//
// 首页卡片 = 全站功能入口，点了跳对应路由（跟顶部菜单进的是同一个页面）。
//
// 这里曾经注册「我的日程表」和「学习成果」两个就地挂载的模块：
// 日程表挪进了头像菜单（/calendar）；学习成果先进过菜单（/learning-results），
// 现在收进仪表板当一张卡。首页这里只留「点了跳路由」的功能入口。

import HomeManager from '../utils/HomeManager';
import type { HomeEntry } from '../utils/HomeManager';

// 顺序跟顶部菜单一致：仪表板排在学习入口前面，书籍挪到最后（它是「待归类」的兜底入口）。
// order 显式写死：register 是幂等的，光靠注册先后调顺序在 dev 热更新下不生效。
const entries: HomeEntry[] = [
  {
    id: 'dashboard',
    order: 1,
    icon: '📊',
    title: (t: (key: string) => string) => t('nav.dashboard'),
    description: (t: (key: string) => string) => t('home.dashboardDesc'),
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    to: '/dashboard',
  },
  {
    id: 'sports',
    order: 2,
    icon: '🏆',
    title: (t: (key: string) => string) => t('nav.sports'),
    description: (t: (key: string) => string) => t('home.sportsDesc'),
    gradient: 'linear-gradient(135deg, #96c93d 0%, #00b09b 100%)',
    to: '/sports',
  },
  {
    id: 'chinese',
    order: 3,
    icon: '✍️',
    title: (t: (key: string) => string) => t('nav.chinese'),
    description: (t: (key: string) => string) => t('home.chineseDesc'),
    gradient: 'linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)',
    to: '/chinese',
  },
  {
    id: 'english',
    order: 4,
    icon: '🔤',
    title: (t: (key: string) => string) => t('nav.english'),
    description: (t: (key: string) => string) => t('home.englishDesc'),
    gradient: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)',
    to: '/english',
  },
  {
    id: 'science',
    order: 5,
    icon: '🔬',
    title: (t: (key: string) => string) => t('nav.science'),
    description: (t: (key: string) => string) => t('home.scienceDesc'),
    gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
    to: '/science',
  },
  {
    id: 'music',
    order: 6,
    icon: '🎵',
    title: (t: (key: string) => string) => t('nav.music'),
    description: (t: (key: string) => string) => t('home.musicDesc'),
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    to: '/music',
  },
  {
    id: 'games',
    order: 7,
    icon: '🎮',
    title: (t: (key: string) => string) => t('nav.games'),
    description: (t: (key: string) => string) => t('home.gamesDesc'),
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    to: '/games',
  },
  {
    id: 'books',
    order: 8,
    icon: '📚',
    title: (t: (key: string) => string) => t('nav.books'),
    description: (t: (key: string) => string) => t('home.booksDesc'),
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    to: '/books',
  },
];

entries.forEach(entry => HomeManager.register(entry));

export default HomeManager;
