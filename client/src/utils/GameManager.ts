import BaseManager from './BaseManager';
import type { ManagerEntry } from './BaseManager';

export interface GameEntry extends ManagerEntry {
  // difficulty?: 'easy' | 'medium' | 'hard';
  // tags?: string[];
}

class GameManager extends BaseManager<GameEntry> {}

export default new GameManager();