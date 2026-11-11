import raw from '../../locales/music.json';
import type { ModuleMessages } from '../types';

const zh: ModuleMessages = {};
const zhTW: ModuleMessages = {};
const en: ModuleMessages = {};

for (const [key, item] of Object.entries(raw)) {
  zh[key] = item['zh-CN'] ?? key;
  zhTW[key] = item['zh-TW'] ?? key;
  en[key] = item.en ?? key;
}

export { zh, zhTW as 'zh-TW', en };
