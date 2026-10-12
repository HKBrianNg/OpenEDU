import { useEffect, useState, useCallback } from 'react';
import type { EventItem } from '../types';
import { eventApi, localStore } from '../api';
import { useAuth } from '../../../store/AuthContext';

// 游客模式下生成本地 id
const genLocalId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useEvents = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 首次加载：已登录从后台拉取，未登录（游客）读本地存储
  // （游客→登录的日程迁移由 AuthContext.login 统一处理，这里不重复做）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (token) {
          const list = await eventApi.list();
          if (!cancelled) setEvents(list);
        } else {
          if (!cancelled) setEvents(localStore.load());
        }
      } catch (e) {
        console.warn('加载日历数据失败，回退到本地数据', e);
        if (!cancelled) setEvents(localStore.load());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // 游客模式下保存到本地
  const saveLocal = useCallback((next: EventItem[]) => {
    setEvents(next);
    localStore.save(next);
  }, []);

  // 新增或更新日程（editingId 存在则为更新）
  const addOrUpdateEvent = useCallback(
    async (event: Omit<EventItem, 'id'>, editingId?: string) => {
      // 游客模式：仅本地
      if (!token) {
        const next = editingId
          ? events.map((e) => (e.id === editingId ? ({ ...event, id: editingId } as EventItem) : e))
          : [...events, { ...event, id: genLocalId() } as EventItem];
        saveLocal(next);
        return;
      }

      // 已登录：走后台
      if (editingId) {
        const updated = await eventApi.update(editingId, event);
        setEvents((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
      } else {
        const created = await eventApi.create(event);
        setEvents((prev) => [...prev, created]);
      }
    },
    [events, token, saveLocal],
  );

  // 删除日程
  const deleteEvent = useCallback(
    async (id: string) => {
      if (!token) {
        saveLocal(events.filter((e) => e.id !== id));
        return;
      }
      await eventApi.remove(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    },
    [events, token, saveLocal],
  );

  const getEventsForDate = useCallback(
    (date: string) => {
      return events.filter((e) => e.date === date);
    },
    [events],
  );

  return { events, loading, addOrUpdateEvent, deleteEvent, getEventsForDate };
};
