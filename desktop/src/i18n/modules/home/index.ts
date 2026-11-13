// desktop/src/i18n/modules/home/index.ts

import { zh as authZh, zhTW as authZhTW, en as authEn } from './auth';
import { zh as homeZh, zhTW as homeZhTW, en as homeEn } from './home';
import { zh as shellZh, zhTW as shellZhTW, en as shellEn } from './shell';

export const zh = {
  ...authZh,
  ...homeZh,
  ...shellZh,
};

export const zhTW = {
  ...authZhTW,
  ...homeZhTW,
  ...shellZhTW,
};

export const en = {
  ...authEn,
  ...homeEn,
  ...shellEn,
};