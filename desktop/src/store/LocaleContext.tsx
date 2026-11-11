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

const LocaleContext = createContext<LocaleContextType>({
  locale: 'zh-CN',
  setLocale: () => {},
  t: (key: string) => key,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useLocale = () => useContext(LocaleContext);

const STORAGE_KEY = 'desktop-locale';

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