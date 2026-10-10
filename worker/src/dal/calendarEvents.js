// src/dal/calendarEvents.js
import { db } from '../utils/db.js';

// 获取用户日程列表（可按日期范围过滤）
async function listCalendarEvents(env, userId, { startDate, endDate } = {}) {
  let filters = `user_id=eq.${userId}`;
  
  if (startDate) {
    filters += `&date=gte.${startDate}`;
  }
  if (endDate) {
    filters += `&date=lte.${endDate}`;
  }

  return db.select(env, 'calendar_events', {
    select: 'id,date,title,time,note,created_at,updated_at',
    filters,
    order: 'date.asc,time.asc',
  });
}

// 获取单个日程
async function findCalendarEventById(env, id, userId) {
  return db.selectOne(env, 'calendar_events', {
    filters: `id=eq.${id}&user_id=eq.${userId}`,
  });
}

// 创建日程
async function createCalendarEvent(env, { userId, date, title, time, note }) {
  return db.insert(env, 'calendar_events', {
    user_id: userId,
    date,
    title,
    time: time || null,
    note: note || null,
  });
}

// 更新日程
async function updateCalendarEvent(env, id, userId, { date, title, time, note }) {
  const updates = {};
  if (date !== undefined) updates.date = date;
  if (title !== undefined) updates.title = title;
  if (time !== undefined) updates.time = time;
  if (note !== undefined) updates.note = note;

  return db.update(env, 'calendar_events', `id=eq.${id}&user_id=eq.${userId}`, updates);
}

// 删除日程
async function deleteCalendarEvent(env, id, userId) {
  return db.delete(env, 'calendar_events', `id=eq.${id}&user_id=eq.${userId}`);
}

export {
  listCalendarEvents,
  findCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
};