import type { FeatureMeta, _FeatureState } from '../types/feature'
import { featureList } from '../config/features'

let featureStates: Map<string, boolean> = new Map()

function initFeatureStates() {
  featureStates.clear()
  function walk(list: FeatureMeta[]) {
    for (const f of list) {
      featureStates.set(f.featureId, f.enabledByDefault)
      if (f.children) walk(f.children)
    }
  }
  walk(featureList)
}
initFeatureStates()

export function getAllMeta(): FeatureMeta[] {
  return featureList
}

export function getFeatureMeta(id: string): FeatureMeta | undefined {
  function find(list: FeatureMeta[]): FeatureMeta | undefined {
    for (const f of list) {
      if (f.featureId === id) return f
      if (f.children) {
        const found = find(f.children)
        if (found) return found
      }
    }
    return undefined
  }
  return find(featureList)
}

export function isFeatureEnabled(featureId: string): boolean {
  return featureStates.get(featureId) ?? false
}

export function setFeatureEnabled(featureId: string, enabled: boolean) {
  featureStates.set(featureId, enabled)
}

export function getFeatureByMenuKey(menuKey: string): FeatureMeta | undefined {
  function find(list: FeatureMeta[]): FeatureMeta | undefined {
    for (const f of list) {
      if (f.menuKey === menuKey) return f
      if (f.children) {
        const found = find(f.children)
        if (found) return found
      }
    }
    return undefined
  }
  return find(featureList)
}
