export function getLocalizedValue(value: any, locale: string): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] || value.zh || '';
}
