import BaseManager from './BaseManager';
import type { ManagerEntry } from './BaseManager';

export interface HomeEntry extends ManagerEntry {
}

class HomeManager extends BaseManager<HomeEntry> {}

export default new HomeManager();