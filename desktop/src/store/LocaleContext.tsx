// desktop/src/store/LocaleContext.tsx

import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { messages } from '../i18n/index';
import type { Locale } from '../i18n/types';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = 'desktop-locale';

/** Provider 之外（如 HMR 模块实例分裂）时的兜底：仍按当前语言查字典，不把 key 显示给用户 */
function fallbackT(key: string): string {
  let l: Locale = 'zh-CN';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh-TW' || stored === 'en') l = stored;
  } catch {
    /* localStorage 不可用时用默认语言 */
  }
  const value = messages[l][key];
  return (typeof value === 'string' && value) || key;
}

// 单例 Context：Vite HMR 重新求值本模块时复用同一个对象，
// 避免 Provider 与页面组件持有不同 Context 实例导致 useContext 拿到默认值。
type LocaleGlobal = typeof globalThis & { __openEduLocaleContext?: React.Context<LocaleContextType> };
const g = globalThis as LocaleGlobal;
const LocaleContext =
  g.__openEduLocaleContext ??
  (g.__openEduLocaleContext = createContext<LocaleContextType>({
    locale: 'zh-CN',
    setLocale: () => {},
    t: fallbackT,
  }));

// eslint-disable-next-line react-refresh/only-export-components
export const useLocale = () => useContext(LocaleContext);

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 从 localStorage 读取，没有则默认 'zh-CN'
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh-CN' || stored === 'zh-TW' || stored === 'en') {
      return stored;
    }
    return 'zh-CN';
  });

  // 切换时持久化
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  };

  const t = (key: string): string => {
    const value = messages[locale][key];

    if (Array.isArray(value)) {
      return value.join('') || key;
    }

    return (value as string) || key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};