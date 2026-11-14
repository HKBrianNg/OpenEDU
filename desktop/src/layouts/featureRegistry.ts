// desktop/src/layouts/featureRegistry.ts

import type { MenuItem, SubModule } from './primaryMenu';
import { primaryMenu } from './primaryMenu';

export function isPrimaryEnabled(item: MenuItem): boolean {
  return item.enabled !== false;
}

export function isFeatureEnabled(featureId: string): boolean {
  for (const item of primaryMenu) {
    if (item.featureId === featureId) return isPrimaryEnabled(item);
    for (const sub of item.children) {
      if (sub.featureId === featureId) return true; // SubModule 暂无 enabled，直接放行
    }
  }
  return true; // 找不到默认放行，不再静默 false
}

export function getEnabledSubModules(parentFeatureId: string): SubModule[] {
  const parent = primaryMenu.find(p => p.featureId === parentFeatureId);
  if (!parent) return [];
  return parent.children;
}