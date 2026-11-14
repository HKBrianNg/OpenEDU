import type { PrimaryMenuItem, SubModule } from '../layouts/primaryMenu';
import { primaryMenu } from '../layouts/primaryMenu';

export function isPrimaryEnabled(item: PrimaryMenuItem): boolean {
  return item.enabled !== false;
}

export function isSubEnabled(sub: SubModule): boolean {
  return sub.enabled !== false;
}

export function isFeatureEnabled(featureId: string): boolean {
  for (const item of primaryMenu) {
    if (item.featureId === featureId) return isPrimaryEnabled(item);
    for (const sub of item.children) {
      if (sub.featureId === featureId) return isSubEnabled(sub);
    }
  }
  return false;
}

export function getEnabledPrimaryMenus(): PrimaryMenuItem[] {
  return primaryMenu.filter(isPrimaryEnabled);
}

export function getEnabledSubModules(parentFeatureId: string): SubModule[] {
  const parent = primaryMenu.find(p => p.featureId === parentFeatureId);
  if (!parent) return [];
  return parent.children.filter(isSubEnabled);
}
