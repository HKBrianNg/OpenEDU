// client/src/utils/BaseManager.ts
import type { ComponentType } from 'react';

export interface ManagerEntry {
  id: string;
  title: string | ((t: (key: string) => string) => string);
  description?: string | ((t: (key: string) => string) => string);
  icon: string;
  /**
   * 路由路径。给了就「点了跳路由」而不是在卡片里就地挂载组件。
   * 首页的功能入口用这个：跳过去和顶部菜单点进去是同一个页面。
   */
  to?: string;
  /** 单张卡片的封面渐变，不给就用外层传进来的统一 gradient */
  gradient?: string;
  /** 管理员才能看的入口（比如仪表板） */
  adminOnly?: boolean;
  // 各模块注册的 component 形态各异（有的只接 onExit，有的还要 courseId 等）；
  // ManagerEntry 是「不同模块组件」的容器，需要「接受任何 props 形态」的能力。
  // 用 any 描述这种异质容器是 TS 官方推荐的少数场景之一：
  //   https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component?: ComponentType<any>;
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