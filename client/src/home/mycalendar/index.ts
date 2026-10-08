import HomeManager from '../../utils/HomeManager';
import type { HomeEntry } from '../../utils/HomeManager';
import MyCalendar from './MyCalendar';

const CalendarEntry: HomeEntry = {
  id: 'MyCalendar',
  title: (t: (key: string) => string) => t('mycalendar.title'),
  description: (t: (key: string) => string) => t('mycalendar.description'),
  icon: '🔤', // 英语单词，用字母 emoji 替代 🤖
  component: MyCalendar,
};

HomeManager.register(CalendarEntry);

export default MyCalendar;