// desktop/src/store/TabContext.tsx
//
// 全局 Tab 状态：只有「具体功能页」跑在 Tab 里；顶栏菜单和模块卡片墙
// （primaryMenu 顶层 route，含首页）是导航页，不产生 Tab。
// 开功能 = 开 Tab，关 Tab = 卸载组件（释放内存）。
// activeRoute 与 URL 同步：直达链接 / F5 刷新自动恢复对应 Tab。

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { primaryMenu } from '../layouts/primaryMenu';

export interface TabMeta {
  route: string;
  icon: string;
  title: string;
}

const STORAGE_KEY = 'opedu.tabs';

/** 顶层菜单 route（首页、模块卡片墙）= 导航页，不进 Tab */
const NAV_ROUTES = new Set(primaryMenu.map((m) => m.route));

export function isTabRoute(route: string): boolean {
  return !NAV_ROUTES.has(route);
}

// 与 Category.tsx 的 buildSubKey 同一套约定：
// 'sub.admin.songs' → 'admin.menu.songs'（+ '.title' 后缀取标题）
const moduleNsMap: Record<string, string> = {
  sports: 'sports',
  chinese: 'chinese',
  english: 'english',
  science: 'science',
  music: 'music',
  games: 'games',
  books: 'books',
  dashboard: 'dashboard',
};

function subTitleKey(i18nPrefix: string): string {
  const parts = i18nPrefix.split('.');
  if (parts.length >= 3) {
    const mod = moduleNsMap[parts[1]] ?? parts[1];
    return `${mod}.menu.${parts.slice(2).join('.')}`;
  }
  return i18nPrefix;
}

/** route → 标题/图标。顶层取 t(i18nPrefix)，子项取 xxx.menu.yyy.title */
export function tabMeta(route: string, t: (key: string) => string): TabMeta {
  for (const m of primaryMenu) {
    if (m.route === route) {
      return { route, icon: m.icon, title: t(m.i18nPrefix) };
    }
    const hit = m.children.find((s) => s.route === route);
    if (hit) {
      return { route, icon: hit.icon, title: t(`${subTitleKey(hit.i18nPrefix)}.title`) };
    }
  }
  return { route, icon: '📄', title: route.replace(/^\//, '') || 'Home' };
}

interface TabContextType {
  tabs: string[];
  activeRoute: string;
  openTab: (route: string) => void;
  closeTab: (route: string) => void;
}

const TabContext = createContext<TabContextType>({
  tabs: [],
  activeRoute: '/',
  openTab: () => {},
  closeTab: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useTabs = () => useContext(TabContext);

function loadStoredTabs(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((r: unknown) => typeof r === 'string' && isTabRoute(r));
  } catch {
    return [];
  }
}

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<string[]>(loadStoredTabs);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  }, [tabs]);

  // URL 驱动激活：直达链接 / 刷新时，当前路由若是功能页则自动开成 Tab
  useEffect(() => {
    if (!isTabRoute(location.pathname)) return;
    setTabs((prev) => (prev.includes(location.pathname) ? prev : [...prev, location.pathname]));
  }, [location.pathname]);

  const openTab = useCallback(
    (route: string) => {
      if (isTabRoute(route)) {
        setTabs((prev) => (prev.includes(route) ? prev : [...prev, route]));
      }
      // 导航页（首页/卡片墙）只切 URL，不产生 Tab
      navigate(route);
    },
    [navigate],
  );

  const closeTab = useCallback(
    (route: string) => {
      const idx = tabs.indexOf(route);
      if (idx < 0) return;
      const next = tabs.filter((r) => r !== route);
      setTabs(next);
      // 关的是激活 Tab → 落到相邻的（优先左边），没有 Tab 了回首页
      if (route === location.pathname) {
        navigate(next[Math.max(0, idx - 1)] ?? '/');
      }
    },
    [tabs, location.pathname, navigate],
  );

  return (
    <TabContext.Provider value={{ tabs, activeRoute: location.pathname, openTab, closeTab }}>
      {children}
    </TabContext.Provider>
  );
}
