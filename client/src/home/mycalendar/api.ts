import type { EventItem } from './types';

export const STORAGE_KEY = 'home_calendar_events';

// 模拟后续 API 请求（目前用 localStorage）
export const eventApi = {
  load: (): EventItem[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('读取日历数据失败', e);
      return [];
    }
  },
  save: (events: EventItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  },
};

export const loadTemplates = async () => {
  const res = await fetch('/data/CalendarTemplate/CalendarTemplate.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};