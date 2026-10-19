// 窄屏判断。断点 768 与 src/components/GameFrame.tsx 保持一致。
//
// 用途：Segmented 内部是 flex 且不换行，年级那行 7 个选项在手机上会横向溢出屏幕，
// 窄屏时改用可换行的按钮组。

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    // 只在 resize 回调里更新，不在 effect 体内同步 setState（避免级联渲染）
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return isMobile;
}
