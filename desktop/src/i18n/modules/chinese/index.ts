// desktop/src/i18n/modules/chinese/index.ts

import { zh as menuZh, zhTW as menuZhTW, en as menuEn } from './menu';
import { zh as hanziWritingZh, zhTW as hanziWritingZhTW, en as hanziWritingEn } from './hanziWriting';

export const zh = {
  ...menuZh,
  ...hanziWritingZh,
};

export const zhTW = {
  ...menuZhTW,
  ...hanziWritingZhTW,
};

export const en = {
  ...menuEn,
  ...hanziWritingEn,
};