import type { EventItem } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

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

// ---- 后台接口（worker /api/calendar-events，需 Bearer token） ----
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any).message || `HTTP ${res.status}`);
  }
  return (data as any).data as T;
}

export const eventApi = {
  // 获取日程列表（支持 ?startDate=&endDate= 过滤）
  list: (params?: { startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    const query = qs.toString();
    return request<EventItem[]>(`/api/calendar-events${query ? `?${query}` : ''}`);
  },

  // 新增日程（返回后台生成的完整记录，含 id；Supabase 返回数组，取第一条）
  create: async (event: Omit<EventItem, 'id'>) => {
    const data = await request<EventItem | EventItem[]>('/api/calendar-events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
    return Array.isArray(data) ? data[0] : data;
  },

  // 更新日程
  update: async (id: string, event: Partial<Omit<EventItem, 'id'>>) => {
    const data = await request<EventItem | EventItem[]>(`/api/calendar-events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    });
    return Array.isArray(data) ? data[0] : data;
  },

  // 删除日程
  remove: (id: string) =>
    request<{ id: string }>(`/api/calendar-events/${id}`, {
      method: 'DELETE',
    }),
};

export const loadTemplates = async () => {
  const res = await fetch('/data/CalendarTemplate/CalendarTemplate.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
