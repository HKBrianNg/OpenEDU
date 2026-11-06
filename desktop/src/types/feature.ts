export interface FeatureMeta {
  featureId: string
  menuKey?: string
  labelKey?: string
  label?: string
  descKey?: string
  enabledByDefault: boolean
  permission?: string
  routePath?: string
  children?: FeatureMeta[]
}

export interface _FeatureState {
  featureId: string
  enabled: boolean
}
