// client/src/utils/BaseManager.ts
import type { ComponentType } from 'react';

export interface ManagerEntry {
  id: string;
  title: string | ((t: (key: string) => string) => string);
  description?: string | ((t: (key: string) => string) => string);
  icon: string;
  component: ComponentType<any>;
}

class BaseManager<T extends ManagerEntry> {
  private registry: Map<string, T> = new Map();

  register(entry: T): void {
    if (this.registry.has(entry.id)) {
      console.warn(`[Manager] "${entry.id}" is already registered.`);
    }
    this.registry.set(entry.id, entry);
  }

  getAll(): T[] {
    return Array.from(this.registry.values());
  }

  get(id: string): T | undefined {
    return this.registry.get(id);
  }
}

export default BaseManager;