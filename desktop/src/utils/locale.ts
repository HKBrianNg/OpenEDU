type LocaleKey = "zh-CN" | "zh-TW" | "en";
type LocaleResource = Record<string, Record<LocaleKey, string>>;

export function getCurrentLocale(): LocaleKey {
  const saved = localStorage.getItem("app-lang");
  if (saved === "zh-CN" || saved === "zh-TW" || saved === "en") {
    return saved;
  }
  return "zh-CN";
}

export function setCurrentLocale(lng: LocaleKey) {
  localStorage.setItem("app-lang", lng);
}

export function createTranslator(resource: LocaleResource) {
  return function t(key: string): string {
    const lng = getCurrentLocale();
    const entry = resource[key];
    if (!entry) return key;
    return entry[lng] ?? entry.en ?? key;
  };
}
