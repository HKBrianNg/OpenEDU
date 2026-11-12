// desktop/src/i18n/modules/sports/index.ts
import { zh as menuZh, zhTW as menuZhTW, en as menuEn } from './menu';
import { zh as sportsVideoZh, zhTW as sportsVideoZhTW, en as sportsVideoEn } from './sportsVideo';

export const zh = {
  ...menuZh,
  ...sportsVideoZh,
};

export const zhTW = {
  ...menuZhTW,
  ...sportsVideoZhTW,
};

export const en = {
  ...menuEn,
  ...sportsVideoEn,
};