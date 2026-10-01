import type { ComponentType } from 'react';

export interface DashboardEntry {
  id: string;
  title: string | ((t: (key: string) => string) => string);
  description?: string | ((t: (key: string) => string) => string);
  icon: string;
  component: ComponentType<any>;
}

class DashboardManager {
  private static instance: DashboardManager;
  private registry: Map<string, DashboardEntry> = new Map();

  static getInstance(): DashboardManager {
    if (!DashboardManager.instance) {
      DashboardManager.instance = new DashboardManager();
    }
    return DashboardManager.instance;
  }

  register(Dashboard: DashboardEntry): void {
    if (this.registry.has(Dashboard.id)) {
      console.warn(`[DashboardManager] Lab "${Dashboard.id}" is already registered.`);
    }
    this.registry.set(Dashboard.id, Dashboard);
  }

  getAll(): DashboardEntry[] {
    return Array.from(this.registry.values());
  }

  get(id: string): DashboardEntry | undefined {
    return this.registry.get(id);
  }
}

export default DashboardManager.getInstance();