// client/src/store/LocaleContext.tsx

import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
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
  t: (key: string) => key,
});

export const useLocale = () => useContext(LocaleContext);

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('zh');

  const t = (key: string): string => {
    const value = messages[locale][key];
    
    // 处理数组类型（如复数形式或嵌套结构）
    if (Array.isArray(value)) {
      return value.join('') || key;
    }
    
    return value || key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};