// tools/src/renderer/useIsMobile.js
// 从网页端 client/src/hooks/useIsMobile.ts 搬过来的同一份实现（768 断点）。
// 桌面窗口拉窄时的排版分支靠它判断。

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return isMobile;
}

export default useIsMobile;
