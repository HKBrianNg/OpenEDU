import { useEffect, useState, useCallback } from 'react';
import type { EventItem } from '../types';
import { eventApi } from '../api';

export const useEvents = () => {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    setEvents(eventApi.load());
  }, []);

  const saveEvents = useCallback((next: EventItem[]) => {
    setEvents(next);
    eventApi.save(next);
  }, []);

  const addOrUpdateEvent = useCallback((event: EventItem, editingId?: string) => {
    let nextEvents: EventItem[];
    if (editingId) {
      nextEvents = events.map((e) => (e.id === editingId ? event : e));
    } else {
      nextEvents = [...events, event];
    }
    saveEvents(nextEvents);
    return nextEvents;
  }, [events, saveEvents]);

  const deleteEvent = useCallback((id: string) => {
    const next = events.filter((e) => e.id !== id);
    saveEvents(next);
  }, [events, saveEvents]);

  const getEventsForDate = useCallback((date: string) => {
    return events.filter((e) => e.date === date);
  }, [events]);

  return { events, addOrUpdateEvent, deleteEvent, getEventsForDate };
};