// src/routes/calendarEventRoutes.js
import { requireAuth } from '../middleware/auth.js';
import {
  listCalendarEventsController,
  getCalendarEventController,
  createCalendarEventController,
  updateCalendarEventController,
  deleteCalendarEventController,
} from '../controllers/calendarEventController.js';

export async function calendarEventRoutes(request, env, { url, lang }) {
  const auth = await requireAuth(request, env, { lang });
  if (!auth.user) {
    return auth;
  }

  // 获取日程列表（支持 ?startDate=&endDate= 过滤）
  if (url.pathname === '/api/calendar-events' && request.method === 'GET') {
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    return listCalendarEventsController({ env, lang, user: auth.user, query: { startDate, endDate } });
  }

  // 获取单个日程
  if (url.pathname.startsWith('/api/calendar-events/') && request.method === 'GET') {
    const id = url.pathname.split('/').pop();
    return getCalendarEventController({ env, lang, user: auth.user, params: { id } });
  }

  // 创建日程
  if (url.pathname === '/api/calendar-events' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    return createCalendarEventController({ env, lang, user: auth.user, body });
  }

  // 更新日程
  if (url.pathname.startsWith('/api/calendar-events/') && request.method === 'PUT') {
    const id = url.pathname.split('/').pop();
    const body = await request.json().catch(() => ({}));
    return updateCalendarEventController({ env, lang, user: auth.user, params: { id }, body });
  }

  // 删除日程
  if (url.pathname.startsWith('/api/calendar-events/') && request.method === 'DELETE') {
    const id = url.pathname.split('/').pop();
    return deleteCalendarEventController({ env, lang, user: auth.user, params: { id } });
  }

  return null;
}