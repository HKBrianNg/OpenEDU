import BaseManager from './BaseManager';
import type { ManagerEntry } from './BaseManager';

class MusicManager extends BaseManager<ManagerEntry> {}

export default new MusicManager();