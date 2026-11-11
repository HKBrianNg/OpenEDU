import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { messages } from '../i18n/index';
import type { Locale } from '../i18n/index';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'zh',
  setLocale: () => {},
  t: (k) => k,
});

export const useLocale = () => useContext(LocaleContext);

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('zh');

  const t = (key: string): string => {
    const val = messages[locale][key];
    if (Array.isArray(val)) return val.join('') || key;
    return val ?? key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};
