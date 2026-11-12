import { zh as menuZh, zhTW as menuZhTW, en as menuEn } from './menu';
import { zh as musicZh, zhTW as musicZhTW, en as musicEn } from './music';

export const zh = { ...menuZh, ...musicZh };
export const zhTW = { ...menuZhTW, ...musicZhTW };
export const en = { ...menuEn, ...musicEn };