// desktop/src/utils/locale.ts
import { useState, useEffect } from 'react';

type LocaleKey = "zh-CN" | "zh-TW" | "en";
type LocaleResource = Record<string, Record<LocaleKey, string>>;

const listeners = new Set<(loc: LocaleKey) => void>();

export function getCurrentLocale(): LocaleKey {
  const saved = localStorage.getItem("app-lang");
  if (saved === "zh-CN" || saved === "zh-TW" || saved === "en") {
    return saved;
  }
  return "zh-CN";
}

export function setCurrentLocale(lng: LocaleKey) {
  localStorage.setItem("app-lang", lng);
  // 通知所有订阅者
  listeners.forEach((cb) => cb(lng));
}

export function createTranslator(resource: LocaleResource) {
  return function t(key: string): string {
    const lng = getCurrentLocale();
    const entry = resource[key];
    if (!entry) return key;
    return entry[lng] ?? entry.en ?? key;
  };
}

// 新增：订阅式 hook
export function useLocale() {
  const [locale, setLocale] = useState<LocaleKey>(getCurrentLocale());

  useEffect(() => {
    const callback = (newLoc: LocaleKey) => {
      setLocale(newLoc);
    };
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }, []);

  return locale;
}
