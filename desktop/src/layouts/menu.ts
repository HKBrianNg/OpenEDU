// desktop/src/types/menu.ts
export interface RawMenuItem {
  key: string;
  label?: string;
  featureId?: string;
  children?: RawMenuItem[];
}
