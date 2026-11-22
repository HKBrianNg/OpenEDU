// desktop/src/layouts/TabShell.tsx
//
// 全局 Tab 壳：替换原 AppShell Content 里的 <Outlet />。
// - 当前路由是功能页（在 tabs 中）→ 显示 Tabs；激活过的 pane 切走保留挂载
// - 当前路由是导航页（首页/模块卡片墙）→ 裸渲染页面，Tabs 隐藏但保持挂载
//   （保活不中断），Tab 行仍在，可随时点回
// 关闭 Tab 时组件卸载（释放内存/监听器/播放状态）。每个 pane 独立滚动。

import { useEffect, useRef } from 'react';
import { Tabs } from 'antd';
import { useLocale } from '../store/LocaleContext';
import { tabMeta, useTabs } from '../store/TabContext';
import { resolveRouteElement } from '../router/routeRegistry';

export function TabShell() {
  const { t } = useLocale();
  const { tabs, activeRoute, openTab, closeTab } = useTabs();

  // 当前在导航页时，Tabs 记住最后一个激活的功能 Tab
  const lastTabRef = useRef<string>('/');
  const activeIsTab = tabs.includes(activeRoute);
  useEffect(() => {
    if (activeIsTab) lastTabRef.current = activeRoute;
  }, [activeIsTab, activeRoute]);

  const items = tabs.map((route) => {
    const meta = tabMeta(route, t);
    return {
      key: route,
      label: (
        <span>
          <span style={{ marginRight: 6 }}>{meta.icon}</span>
          {meta.title}
        </span>
      ),
      children: (
        <div className="custom-scroll" style={{ height: '100%', overflowY: 'auto' }}>
          {resolveRouteElement(route)}
        </div>
      ),
    };
  });

  return (
    <div style={{ height: '100%' }}>
      {/* 功能页 Tabs：在导航页时 display:none 但保持挂载（保活） */}
      <div style={{ display: activeIsTab ? 'block' : 'none', height: '100%' }}>
        <Tabs
          type="editable-card"
          hideAdd
          size="small"
          className="tab-shell"
          activeKey={activeIsTab ? activeRoute : lastTabRef.current}
          items={items}
          onChange={openTab}
          onEdit={(targetKey, action) => {
            if (action === 'remove' && typeof targetKey === 'string') closeTab(targetKey);
          }}
        />
      </div>

      {/* 导航页（首页/卡片墙）不在 Tab 里，裸渲染 */}
      {!activeIsTab && (
        <div className="custom-scroll" style={{ height: '100%', overflowY: 'auto' }}>
          {resolveRouteElement(activeRoute)}
        </div>
      )}
    </div>
  );
}
