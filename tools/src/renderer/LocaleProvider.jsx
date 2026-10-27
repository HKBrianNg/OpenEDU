// tools/src/renderer/LocaleProvider.jsx
//
// 把「当前语言」做成 context：切语言时整个界面换成另一张字典。
// 语言跟主题一样存在 settings.json 里（键：locale），没登录也能改 —— 那是偏好，不是权限。

import { createContext, useContext, useMemo } from 'react';
import { setCurrentLocale, tableFor } from './i18n';

const LocaleContext = createContext(null);

export function LocaleProvider({ locale = 'zh', children }) {
  const value = useMemo(() => {
    const table = tableFor(locale);
    setCurrentLocale(locale);
    return {
      locale,
      t: (key) => table[key] ?? key,
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LocaleContext);
  // Provider 没套上的时候（比如某个组件被单独渲染）退回默认中文，别直接崩
  return ctx ?? { locale: 'zh', t: (key) => tableFor('zh')[key] ?? key };
}
