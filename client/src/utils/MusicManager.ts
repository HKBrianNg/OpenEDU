// client/src/utils/MusicManager.ts
import BaseManager from './BaseManager';
import type { ManagerEntry } from './BaseManager';

export interface MusicEntry extends ManagerEntry {
  // 音乐模块特有字段，按需扩展
  artist?: string;
  duration?: number;
}

class MusicManager extends BaseManager<MusicEntry> {}

export default new MusicManager();