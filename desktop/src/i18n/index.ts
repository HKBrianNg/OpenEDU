import type { Messages, Locale } from './types';
import { zh as musicZh, 'zh-TW' as musicZhTW, en as musicEn } from './modules/music';

export type { Locale };

export const messages: Messages = {
  zh: {
    ...musicZh,
  },
  'zh-TW': {
    ...musicZhTW,
  },
  en: {
    ...musicEn,
  },
};
