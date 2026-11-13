# AI Context — 本项目架构约定

## i18n 规范
- 目录：src/i18n/modules/模块名/
- 每个模块：index.ts 聚合子文件
- 子文件 export：zh / zhTW / en（具名，不用 default）
- key 命名：模块.子域.功能.title|desc（全扁平，点分隔）
- 顶层：src/i18n/index.ts 合并所有模块到 messages
- 新增模块 checklist：建目录 → 写子文件 → index.ts 聚合 → 顶层 import+展开

## 路由规范
- kebab-case：/english/english-word、/dashboard/learning-results
- 页面文件：desktop/src/pages/模块/功能/index.tsx
- 组件 export：export function（不用 default）
- 删 onExit prop，统一用路由导航
- 保留 .xxx-scroll 外层容器 + CSS 文件

## 菜单配置
- desktop/src/config/primaryMenu.ts
- featureId: kebab-case，route 与路由一致
- children 为空 = 叶子节点，有 children = 父导航

## 进度系统
- useProgress hook 路径：../EnglishWord/hooks/useProgress
- 默认保留进度系统，除非明确要求砍掉
- 状态：pending / learning / mastered

## 移动端
- desktop 端不需要 useIsMobile，全部走桌面布局

## 导入层级
- 统一 3 层：../../../utils/、../../../store/、../../../hooks/
- locale 判断用 'zh-CN'（不用 'zh'）

## 新增功能标准流程
1. 建页面组件（export function, .scroll 容器, CSS）
2. 注册路由
3. 加菜单入口（primaryMenu.ts）
4. 加 i18n（modules/模块名/功能.ts + index.ts 聚合 + 顶层展开）