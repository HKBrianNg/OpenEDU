import type { Locale, Messages } from './types';
import { zh as authZh, en as authEn } from './modules/auth';
import { zh as commonZh, en as commonEn } from './modules/common';
import { zh as coursesZh, en as coursesEn } from './modules/courses';
import { zh as gamesZh, en as gamesEn } from './modules/games';
import { zh as labZh, en as labEn } from './modules/lab';
import { zh as booksZh, en as booksEn } from './modules/books';
import { zh as musicZh, en as musicEn } from './modules/music';
import { zh as calendarZh, en as calendarEn } from './modules/calendar';
import { zh as dashboardZh, en as dashboardEn } from './modules/dashboard';

export type { Locale } from './types';

export const messages: Record<Locale, Messages> = {
  zh: {
    ...authZh,
    ...commonZh,
    ...coursesZh,
    ...gamesZh,
    ...labZh,
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
    ...labEn,
    ...booksEn,
    ...musicEn,
    ...calendarEn,
    ...dashboardEn,
  },
};