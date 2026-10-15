import BaseManager from './BaseManager';
import type { ManagerEntry } from './BaseManager';

// 主页模块特有字段，按需扩展（暂时和 ManagerEntry 同形）
export type HomeEntry = ManagerEntry

class HomeManager extends BaseManager<HomeEntry> {}

export default new HomeManager();