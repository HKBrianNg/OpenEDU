// desktop/src/i18n/index.ts
import type { Messages } from './types';
import { zh as authZh, zhTW as authZhTW, en as authEn } from './modules/auth';
import { zh as commonZh, zhTW as commonZhTW, en as commonEn } from './modules/common';
import { zh as coursesZh, zhTW as coursesZhTW, en as coursesEn } from './modules/courses';
import { zh as gamesZh, zhTW as gamesZhTW, en as gamesEn } from './modules/games';
import { zh as englishZh, zhTW as englishZhTW, en as englishEn } from './modules/english';
import { zh as hanziWritingZh, zhTW as hanziWritingZhTW, en as hanziWritingEn } from './modules/hanziWriting';
import { zh as musicZh, zhTW as musicZhTW, en as musicEn } from './modules/music';
import { zh as mycalendarZh, zhTW as mycalendarZhTW, en as mycalendarEn } from './modules/mycalendar';
import { zh as learningResultsZh, zhTW as learningResultsZhTW, en as learningResultsEn } from './modules/learningresults';
import { zh as dashboardZh, zhTW as dashboardZhTW, en as dashboardEn } from './modules/dashboard';
import { zh as juniorEncyclopediaZh, zhTW as juniorEncyclopediaZhTW, en as juniorEncyclopediaEn } from './modules/juniorEncyclopedia';
import { zh as knowledgebaseZh, zhTW as knowledgebaseZhTW, en as knowledgebaseEn } from './modules/knowledgebase';
import { zh as sportsVideoZh, zhTW as sportsVideoZhTW, en as sportsVideoEn } from './modules/sportsVideo';
import { zh as shellZh, zhTW as shellZhTW, en as shellEn } from './modules/shell';

export type { Locale } from './types';

export const messages: Messages = {
  'zh-CN': {
    ...authZh,
    ...commonZh,
    ...coursesZh,
    ...gamesZh,
    ...englishZh,
    ...hanziWritingZh,
    ...musicZh,
    ...mycalendarZh,
    ...learningResultsZh,
    ...dashboardZh,
    ...juniorEncyclopediaZh,
    ...knowledgebaseZh,
    ...sportsVideoZh,
    ...shellZh,
  },
  'zh-TW': {
    ...authZhTW,
    ...commonZhTW,
    ...coursesZhTW,
    ...gamesZhTW,
    ...englishZhTW,
    ...hanziWritingZhTW,
    ...musicZhTW,
    ...mycalendarZhTW,
    ...learningResultsZhTW,
    ...dashboardZhTW,
    ...juniorEncyclopediaZhTW,
    ...knowledgebaseZhTW,
    ...sportsVideoZhTW,
    ...shellZhTW,
  },
  en: {
    ...authEn,
    ...commonEn,
    ...coursesEn,
    ...gamesEn,
    ...englishEn,
    ...hanziWritingEn,
    ...musicEn,
    ...mycalendarEn,
    ...learningResultsEn,
    ...dashboardEn,
    ...juniorEncyclopediaEn,
    ...knowledgebaseEn,
    ...sportsVideoEn,
    ...shellEn,
  },
};