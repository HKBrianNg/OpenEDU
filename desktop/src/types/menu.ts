export interface RawMenuItem {
  key: string;
  // 如果后端给的是翻译 key，就放这里
  labelKey?: string;
  // 如果没有翻译，直接用这个文字
  label?: string;
  children?: RawMenuItem[];
}
