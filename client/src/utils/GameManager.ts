import BaseManager from './BaseManager';
import type { ManagerEntry } from './BaseManager';

// 游戏模块特有字段，按需扩展（暂时和 ManagerEntry 同形）
export type GameEntry = ManagerEntry

class GameManager extends BaseManager<GameEntry> {}

export default new GameManager();