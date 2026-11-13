// desktop/src/i18n/modules/dashboard/index.ts
import { zh as menuZh, zhTW as menuZhTW, en as menuEn } from './menu';
import { zh as learningResultsZh, zhTW as learningResultsZhTW, en as learningResultsEn } from './learningResults';
import { zh as myCalendarZh, zhTW as myCalendarZhTW, en as myCalendarEn } from './myCalendar';
import { zh as adminConsoleZh, zhTW as adminConsoleZhTW, en as adminConsoleEn } from './adminConsole';

export const zh = {
  ...menuZh,
  ...learningResultsZh,
  ...myCalendarZh,
  ...adminConsoleZh,
};

export const zhTW = {
  ...menuZhTW,
  ...learningResultsZhTW,
  ...myCalendarZhTW,
  ...adminConsoleZhTW,
};

export const en = {
  ...menuEn,
  ...learningResultsEn,
  ...myCalendarEn,
  ...adminConsoleEn,
};