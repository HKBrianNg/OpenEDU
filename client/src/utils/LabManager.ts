import type { ComponentType } from 'react';

export interface LabEntry {
  id: string;
  title: string | ((t: (key: string) => string) => string);
  description?: string | ((t: (key: string) => string) => string);
  icon: string;
  component: ComponentType<any>;
}

class LabManager {
  private static instance: LabManager;
  private registry: Map<string, LabEntry> = new Map();

  static getInstance(): LabManager {
    if (!LabManager.instance) {
      LabManager.instance = new LabManager();
    }
    return LabManager.instance;
  }

  register(lab: LabEntry): void {
    if (this.registry.has(lab.id)) {
      console.warn(`[LabManager] Lab "${lab.id}" is already registered.`);
    }
    this.registry.set(lab.id, lab);
  }

  getAll(): LabEntry[] {
    return Array.from(this.registry.values());
  }

  get(id: string): LabEntry | undefined {
    return this.registry.get(id);
  }
}

export default LabManager.getInstance();