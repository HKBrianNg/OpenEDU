// desktop/src/router.tsx
//
// Tab 化后路由只剩壳：AppShell + '*' 通配（渲染 TabShell）。
// 所有页面的 path → 组件映射在 src/router/routeRegistry.tsx，
// 页面的开/关/保活由 TabContext + TabShell 管理。

import { createHashRouter } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import { TabShell } from './layouts/TabShell';

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [{ path: '*', element: <TabShell /> }],
  },
]);
