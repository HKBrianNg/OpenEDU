// desktop/src/i18n/modules/science/index.ts
import { zh as menuZh, zhTW as menuZhTW, en as menuEn } from './menu';
import { zh as kbZh, zhTW as kbZhTW, en as kbEn } from './knowledgebase';
import { zh as jeZh, zhTW as jeZhTW, en as jeEn } from './juniorEncyclopedia';

export const zh = {
  ...menuZh,
  ...kbZh,
  ...jeZh,
};

export const zhTW = {
  ...menuZhTW,
  ...kbZhTW,
  ...jeZhTW,
};

export const en = {
  ...menuEn,
  ...kbEn,
  ...jeEn,
};