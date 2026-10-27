// client/src/home/index.ts
//
// 首页卡片 = 全站功能入口，点了跳对应路由（跟顶部菜单进的是同一个页面）。
//
// 这里曾经注册「我的日程表」和「学习成果」两个就地挂载的模块：
// 日程表挪进了头像菜单（/calendar）；学习成果先进过菜单（/learning-results），
// 现在收进仪表板当一张卡。首页这里只留「点了跳路由」的功能入口。

import HomeManager from '../utils/HomeManager';
import type { HomeEntry } from '../utils/HomeManager';

const entries: HomeEntry[] = [
  {
    id: 'books',
    icon: '📚',
    title: (t: (key: string) => string) => t('nav.books'),
    description: (t: (key: string) => string) => t('home.booksDesc'),
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    to: '/books',
  },
  {
    id: 'music',
    icon: '🎵',
    title: (t: (key: string) => string) => t('nav.music'),
    description: (t: (key: string) => string) => t('home.musicDesc'),
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    to: '/music',
  },
  {
    id: 'games',
    icon: '🎮',
    title: (t: (key: string) => string) => t('nav.games'),
    description: (t: (key: string) => string) => t('home.gamesDesc'),
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    to: '/games',
  },
  {
    id: 'dashboard',
    icon: '📊',
    title: (t: (key: string) => string) => t('nav.dashboard'),
    description: (t: (key: string) => string) => t('home.dashboardDesc'),
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    to: '/dashboard',
  },
];

entries.forEach(entry => HomeManager.register(entry));

export default HomeManager;
