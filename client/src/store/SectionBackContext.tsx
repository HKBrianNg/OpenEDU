// client/src/store/SectionBackContext.tsx
//
// 「返回上一层」按钮的登记处。
//
// 书本/音乐/游戏展开某个模块后，「返回书籍」这类按钮原本只画在页面顶部，
// 用户滚到一半想回去就得滑回页顶。头部（MainLayout）是固定不动的，
// 但它不知道 ModuleFrame 里当前有没有展开模块 —— 那个状态在 ModuleFrame 自己手里。
//
// 所以让 ModuleFrame 在展开时把「文案 + 回去的动作」登记到这里，
// 头部从这儿读出来画按钮。

import React, { createContext, useContext, useState } from 'react';

export interface SectionBack {
  /** 按钮文案，比如「返回书籍」 */
  label: string;
  /** 点了要做什么，比如 ModuleFrame 的 setSelectedId(null) */
  onBack: () => void;
}

interface SectionBackContextValue {
  back: SectionBack | null;
  setBack: (back: SectionBack | null) => void;
}

const SectionBackContext = createContext<SectionBackContextValue>({
  back: null,
  setBack: () => {},
});

export const SectionBackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [back, setBack] = useState<SectionBack | null>(null);

  return (
    <SectionBackContext.Provider value={{ back, setBack }}>
      {children}
    </SectionBackContext.Provider>
  );
};

export const useSectionBack = () => useContext(SectionBackContext);
