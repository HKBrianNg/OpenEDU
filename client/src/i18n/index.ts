// client/src/i18n/index.ts

import type { Messages } from './types';
import { zh as authZh, en as authEn } from './modules/auth';
import { zh as commonZh, en as commonEn } from './modules/common';
import { zh as coursesZh, en as coursesEn } from './modules/courses';
import { zh as gamesZh, en as gamesEn } from './modules/games';
import { zh as booksZh, en as booksEn } from './modules/books';
import { zh as musicZh, en as musicEn } from './modules/music';
import { zh as calendarZh, en as calendarEn } from './modules/calendar';
import { zh as dashboardZh, en as dashboardEn } from './modules/dashboard';

export type { Locale } from './types';

// 显式标注为 Messages 类型，避免 TS 推断变宽
export const messages: Messages = {
  zh: {
    ...authZh,
    ...commonZh,
    ...coursesZh,
    ...gamesZh,
    ...booksZh,
    ...musicZh,
    ...calendarZh,
    ...dashboardZh,
  },
  en: {
    ...authEn,
    ...commonEn,
    ...coursesEn,
    ...gamesEn,
    ...booksEn,
    ...musicEn,
    ...calendarEn,
    ...dashboardEn,
  },
};