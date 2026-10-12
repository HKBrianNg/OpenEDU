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

  // 幂等注册：同 id 已存在则跳过。
  // Vite HMR 会重新执行模块顶层的 register()，但本模块（Manager）不会重载，
  // registry 会保留旧条目——跳过既消除重复警告，也保持组件引用稳定
  register(entry: T): void {
    if (this.registry.has(entry.id)) {
      return;
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