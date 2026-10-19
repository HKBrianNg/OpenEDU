// 窄屏判断。断点 768 与 src/components/GameFrame.tsx 保持一致。
//
// 用途：
//   - Segmented 内部是 flex 且不换行，选项一多（如年级 7 个）在手机上会横向溢出
//   - 绝对定位到标题右侧的按钮，窄屏会和标题挤在一起
//   这两种情况都需要在窄屏换成可折行的排布。

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
