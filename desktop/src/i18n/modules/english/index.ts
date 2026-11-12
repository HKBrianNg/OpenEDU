// desktop/src/i18n/modules/english/index.ts

import { zh as englishwordZh, en as englishwordEn, zhTW as englishwordZhTW } from './englishword';
import { zh as basicEnglish300Zh, en as basicEnglish300En, zhTW as basicEnglish300ZhTW } from './basicEnglish300';
import { zh as englishVideoZh, en as englishVideoEn, zhTW as englishVideoZhTW } from './englishVideo';
import { zh as englishShortsZh, en as englishShortsEn, zhTW as englishShortsZhTW } from './englishshorts';
import { zh as menuZh, zhTW as menuZhTW, en as menuEn } from './menu';

export const zh = {
  ...englishwordZh,
  ...basicEnglish300Zh,
  ...englishVideoZh,
  ...englishShortsZh,
  ...menuZh,
};

export const en = {
  ...englishwordEn,
  ...basicEnglish300En,
  ...englishVideoEn,
  ...englishShortsEn,
  ...menuEn,
};

export const zhTW = {
  ...englishwordZhTW,
  ...basicEnglish300ZhTW,
  ...englishVideoZhTW,
  ...englishShortsZhTW,
  ...menuZhTW,
};