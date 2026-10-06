import BaseManager from './BaseManager';
import type { ManagerEntry } from './BaseManager';

export interface DashboardEntry extends ManagerEntry {
  adminOnly?: boolean;
}

class DashboardManager extends BaseManager<DashboardEntry> {}

export default new DashboardManager();