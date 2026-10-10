// src/controllers/calendarEventController.js
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import {
  listCalendarEvents,
  findCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../dal/calendarEvents.js';

// 获取日程列表
export const listCalendarEventsController = async ({ env, lang, user, query }) => {
  try {
    const { startDate, endDate } = query;
    const events = await listCalendarEvents(env, user.id, { startDate, endDate });

    return json({
      code: 'CALENDAR_EVENTS_RETRIEVED',
      message: getMessage('CALENDAR_EVENTS_RETRIEVED', lang),
      data: events,
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};

// 获取单个日程
export const getCalendarEventController = async ({ env, lang, user, params }) => {
  const { id } = params;

  try {
    const event = await findCalendarEventById(env, id, user.id);
    if (!event) {
      return json({
        code: 'CALENDAR_EVENT_NOT_FOUND',
        message: getMessage('CALENDAR_EVENT_NOT_FOUND', lang),
      }, 404);
    }

    return json({
      code: 'CALENDAR_EVENT_RETRIEVED',
      message: getMessage('CALENDAR_EVENT_RETRIEVED', lang),
      data: event,
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};

// 创建日程
export const createCalendarEventController = async ({ env, lang, user, body }) => {
  const { date, title, time, note } = body || {};

  if (!date || !title) {
    return json({
      code: 'INVALID_INPUT',
      message: getMessage('INVALID_INPUT', lang),
    }, 400);
  }

  try {
    const event = await createCalendarEvent(env, {
      userId: user.id,
      date,
      title,
      time,
      note,
    });

    return json({
      code: 'CALENDAR_EVENT_CREATED',
      message: getMessage('CALENDAR_EVENT_CREATED', lang),
      data: event,
    }, 201);
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};

// 更新日程
export const updateCalendarEventController = async ({ env, lang, user, params, body }) => {
  const { id } = params;
  const { date, title, time, note } = body || {};

  if (date === undefined && title === undefined && time === undefined && note === undefined) {
    return json({
      code: 'INVALID_INPUT',
      message: getMessage('INVALID_INPUT', lang),
    }, 400);
  }

  try {
    const existing = await findCalendarEventById(env, id, user.id);
    if (!existing) {
      return json({
        code: 'CALENDAR_EVENT_NOT_FOUND',
        message: getMessage('CALENDAR_EVENT_NOT_FOUND', lang),
      }, 404);
    }

    const updated = await updateCalendarEvent(env, id, user.id, { date, title, time, note });

    return json({
      code: 'CALENDAR_EVENT_UPDATED',
      message: getMessage('CALENDAR_EVENT_UPDATED', lang),
      data: updated,
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};

// 删除日程
export const deleteCalendarEventController = async ({ env, lang, user, params }) => {
  const { id } = params;

  try {
    const existing = await findCalendarEventById(env, id, user.id);
    if (!existing) {
      return json({
        code: 'CALENDAR_EVENT_NOT_FOUND',
        message: getMessage('CALENDAR_EVENT_NOT_FOUND', lang),
      }, 404);
    }

    await deleteCalendarEvent(env, id, user.id);

    return json({
      code: 'CALENDAR_EVENT_DELETED',
      message: getMessage('CALENDAR_EVENT_DELETED', lang),
      data: { id },
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};