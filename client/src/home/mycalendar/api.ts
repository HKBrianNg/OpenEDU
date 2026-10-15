import type { EventItem } from './types';
import { api } from '../../utils/request';
import { storage, STORAGE_KEYS } from '../../utils/storage';

// 兼容旧引用：日历事件仍以 STORAGE_KEY 名义导出，实际指向集中注册的 key
export const STORAGE_KEY = STORAGE_KEYS.calendarEvents;

// ---- 本地存储（游客模式 / 加载失败兜底） ----
export const localStore = {
  load: (): EventItem[] => {
    return storage.get<EventItem[]>(STORAGE_KEY) ?? [];
  },
  save: (events: EventItem[]) => {
    storage.set(STORAGE_KEY, events);
  },
  clear: () => {
    storage.remove(STORAGE_KEY);
  },
};

// 游客 → 登录的日程迁移：把本地游客日程搬到服务器（剥离本地 id，由服务器生成），
// 全部成功后清空本地；任一失败则保留本地，下次登录重试。
// 只由 AuthContext.login 调用（唯一迁移入口，避免多处触发重复创建）
export async function migrateGuestEvents(): Promise<void> {
  const localEvents = localStore.load();
  if (localEvents.length === 0) return;
  try {
    for (const ev of localEvents) {
      // 迁移时本地 id 没有意义（服务器会生成新 id），用 _ 前缀显式忽略
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _localId, ...rest } = ev;
      await eventApi.create(rest);
    }
    localStore.clear();
  } catch (e) {
    console.warn('游客日程迁移失败，保留本地数据', e);
  }
}

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
