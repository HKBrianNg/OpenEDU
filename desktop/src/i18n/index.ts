// desktop/src/i18n/index.ts
import type { Messages } from './types';

import { zh as authZh, zhTW as authZhTW, en as authEn } from './modules/auth';
// import { zh as commonZh, zhTW as commonZhTW, en as commonEn } from './modules/common';
// import { zh as coursesZh, zhTW as coursesZhTW, en as coursesEn } from './modules/courses';
import { zh as gamesZh, zhTW as gamesZhTW, en as gamesEn } from './modules/games';
import { zh as englishZh, zhTW as englishZhTW, en as englishEn } from './modules/english';
import { zh as chineseZh, zhTW as chineseZhTW, en as chineseEn } from './modules/chinese';
import { zh as sportsZh, zhTW as sportsZhTW, en as sportsEn } from './modules/sports';
import { zh as scienceZh, zhTW as scienceZhTW, en as scienceEn } from './modules/science';
import { zh as musicZh, zhTW as musicZhTW, en as musicEn } from './modules/music';
import { zh as shellZh, zhTW as shellZhTW, en as shellEn } from './modules/shell';
import { zh as homeZh, zhTW as homeZhTW, en as homeEn } from './modules/home';
import { zh as dashboardZh, zhTW as dashboardZhTW, en as dashboardEn } from './modules/dashboard';

export type { Locale } from './types';

export const messages: Messages = {
  'zh-CN': {
    ...authZh,
    // ...commonZh,
    // ...coursesZh,
    ...gamesZh,
    ...englishZh,
    ...chineseZh,
    ...sportsZh,
    ...scienceZh,
    ...musicZh,
    ...shellZh,
    ...homeZh,
    ...dashboardZh,
  },
  'zh-TW': {
    ...authZhTW,
    // ...commonZhTW,
    // ...coursesZhTW,
    ...gamesZhTW,
    ...englishZhTW,
    ...chineseZhTW,
    ...sportsZhTW,
    ...scienceZhTW,
    ...musicZhTW,
    ...shellZhTW,
    ...homeZhTW,
    ...dashboardZhTW,
  },
  en: {
    ...authEn,
    // ...commonEn,
    // ...coursesEn,
    ...gamesEn,
    ...englishEn,
    ...chineseEn,
    ...sportsEn,
    ...scienceEn,
    ...musicEn,
    ...shellEn,
    ...homeEn,
    ...dashboardEn,
  },
};