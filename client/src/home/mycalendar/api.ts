import type { EventItem } from './types';
import { api } from '../../utils/request';

export const STORAGE_KEY = 'home_calendar_events';

// ---- 本地存储（游客模式 / 加载失败兜底） ----
export const localStore = {
  load: (): EventItem[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('读取本地日历数据失败', e);
      return [];
    }
  },
  save: (events: EventItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  },
};

// ---- 后台接口（worker /api/calendar-events，token 由统一模块自动携带） ----
// 统一模块返回 { ok, status, data }；这里再解包为 data.data，失败时抛错
function unwrap<T>(result: { ok: boolean; status: number; data: { message?: string; data?: unknown } }): T {
  if (!result.ok) {
    throw new Error(result.data?.message || `HTTP ${result.status}`);
  }
  return result.data?.data as T;
}

export const eventApi = {
  // 获取日程列表（支持 ?startDate=&endDate= 过滤）
  list: async (params?: { startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    const query = qs.toString();
    const res = await api.get(`/api/calendar-events${query ? `?${query}` : ''}`);
    return unwrap<EventItem[]>(res);
  },

  // 新增日程（返回后台生成的完整记录，含 id；Supabase 返回数组，取第一条）
  create: async (event: Omit<EventItem, 'id'>) => {
    const res = await api.post('/api/calendar-events', event);
    const data = unwrap<EventItem | EventItem[]>(res);
    return Array.isArray(data) ? data[0] : data;
  },

  // 更新日程
  update: async (id: string, event: Partial<Omit<EventItem, 'id'>>) => {
    const res = await api.put(`/api/calendar-events/${id}`, event);
    const data = unwrap<EventItem | EventItem[]>(res);
    return Array.isArray(data) ? data[0] : data;
  },

  // 删除日程
  remove: async (id: string) => {
    const res = await api.delete(`/api/calendar-events/${id}`);
    return unwrap<{ id: string }>(res);
  },
};

export const loadTemplates = async () => {
  const res = await fetch('/data/CalendarTemplate/CalendarTemplate.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
