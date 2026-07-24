好的，这是精简版 Skill 文档的完整 Markdown 内容，你可以直接复制保存为 OpenEDU_Skill_Document.md：

OpenEDU 项目 Skill 文档（精简版）

一、项目概览

项目 说明

名称 OpenEDU - 开源在线教育平台

前端 React 18 + Vite 5 + MUI 5 + JavaScript

后端 Node.js + Express + Sequelize 6

数据库 Supabase PostgreSQL

多语言 简体中文、繁体中文、英文

静态资源 开发/Staging 用七牛云，生产用腾讯云 COS

代码管理 Gitee（码云）

二、通用规则

规则 要求

命名 变量/函数/组件用英文，注释可用中文

提交格式 feat(scope): 描述 / fix(scope): 描述

错误处理 统一格式 { code, message, data }

测试 新增功能需附带单元测试，覆盖率 ≥ 80%

数据库 禁止手写 SQL，全部通过 Sequelize Model

日志 前后端均需记录，按 debug/info/warn/error 分级

网络请求 统一使用 Axios，禁止 fetch 或 XMLHttpRequest

安全 全站 HTTPS、Token 安全传递、日志脱敏

多语言 所有用户可见文本必须通过 i18next，禁止硬编码

静态资源 图片/音频不放在前端项目，统一走 CDN

三、目录结构


openedu/
├── client/                    # React 前端
│   ├── public/
│   │   ├── locales/           # 翻译文件 (zh-CN, zh-HK, en)
│   │   └── favicon.ico, logo.svg
│   ├── src/
│   │   ├── api/               # Axios 接口封装
│   │   ├── components/        # 公共组件
│   │   ├── pages/             # 页面组件
│   │   ├── layouts/           # 布局组件 (MainLayout, AuthLayout)
│   │   ├── router/            # 路由配置 + ProtectedRoute
│   │   ├── store/             # Zustand 状态管理
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── i18n/              # 国际化配置
│   │   ├── utils/             # 工具函数 (validations.js)
│   │   ├── logger/            # 前端日志
│   │   └── theme.js           # MUI 主题
│   ├── vercel.json
│   └── package.json
│
├── server/                    # Node.js 后端
│   ├── models/                # Sequelize 模型 (User, Course, Lesson...)
│   ├── migrations/            # 数据库迁移
│   ├── seeders/               # 种子数据
│   ├── routes/                # 路由 (auth, courses, users...)
│   ├── controllers/           # 控制器
│   ├── services/              # 服务层 (StorageService)
│   ├── middleware/            # 中间件 (auth, errorHandler)
│   ├── config/                # 配置 (database, storage)
│   ├── logger/                # 后端日志
│   ├── zeabur.yaml
│   ├── render.yaml
│   └── index.js
│
├── docs/                      # 文档
├── .gitee/workflows/          # CI/CD 配置
├── .gitignore
└── README.md


四、前端 Library 清单

类别 库名 版本 必需

核心 react, react-dom, react-router-dom ^18.x / ^6.x ✅

构建 vite, @vitejs/plugin-react ^5.x / ^4.x ✅

UI @mui/material, @mui/icons-material, @emotion/react, @emotion/styled ^5.x / ^11.x ✅

状态管理 zustand ^4.x ✅

服务端状态 @tanstack/react-query ^5.x ✅

HTTP axios ^1.x ✅

表单 react-hook-form, @hookform/resolvers, zod ^7.x / ^3.x ✅

国际化 i18next, react-i18next, i18next-browser-languagedetector, i18next-http-backend ^23.x / ^14.x / ^8.x ✅

日期 dayjs ^1.x ✅

通知 notistack ^3.x ✅

播放器 react-player ^2.x ✅

动画 framer-motion ^11.x ⭕

拖拽 @dnd-kit/core ^6.x ⭕

测试 vitest, @testing-library/react, jsdom ^1.x / ^14.x ✅

五、后端 Library 清单

类别 库名 版本 必需

核心 express, sequelize, pg, pg-hstore ^4.x / ^6.x / ^8.x ✅

认证 jsonwebtoken, bcryptjs ^9.x / ^2.x ✅

安全 helmet, cors, express-rate-limit ^7.x / ^2.x / ^7.x ✅

存储 multer, qiniu, cos-nodejs-sdk-v5 ^1.x / ^7.x / ^5.x ✅

日志 winston, morgan ^3.x / ^1.x ✅

工具 dotenv ^16.x ✅

开发 nodemon, eslint, prettier ^3.x / ^8.x ✅

六、Library 使用规范

Library 核心规范

TanStack Query 所有 API 请求用 useQuery/useMutation；staleTime 5 分钟；失败重试 2 次

Zustand 按功能拆 Store（UI/Auth/Player）；持久化用 persist 中间件；不存放 API 逻辑

react-hook-form 所有表单必须用它；校验用 zod schema；MUI 组件用 Controller 包裹

notistack success/error/info/warning 四种 variant；自动关闭 3 秒；最多同时 3 条

react-player 所有音视频播放统一用它；播放状态由 usePlayerStore 管理

dayjs 所有日期处理统一用它；根据语言动态设置 locale

framer-motion 页面过渡用统一动画（opacity + y）；列表用交错入场；按钮用缩放反馈

Axios 统一实例配置 baseURL + 拦截器；Token 自动附加；401 自动刷新

七、部署平台规范

环境 平台 说明

开发 本地 localhost:3000 npm run dev

Staging Render（新加坡节点，免费层） 自动部署 develop 分支，15 分钟无访问休眠

生产 Zeabur 自动部署 main 分支，国内访问快，$5/月免费额度

render.yaml（Staging）

services:
  - type: web
    name: openedu-api-staging
    env: node
    region: singapore
    plan: free
    buildCommand: npm install
    startCommand: node index.js
    healthCheckPath: /api/health


zeabur.yaml（Production）

name: openedu-api
services:
  - name: api
    type: web
    runtime: node
    buildCommand: npm install
    startCommand: node index.js
    port: 3000
    healthCheck:
      path: /api/health


环境变量

NODE_ENV=production
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
STORAGE_PROVIDER=qiniu
QINIU_ACCESS_KEY=xxx
QINIU_SECRET_KEY=xxx
QINIU_BUCKET=openedu-staging
QINIU_DOMAIN=https://cdn-staging.openedu.com
JWT_SECRET=xxx
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
LOG_LEVEL=info


CORS 配置

const allowedOrigins = {
  development: ['http://localhost:5173'],
  staging: ['https://staging.openedu.com'],
  production: ['https://openedu.com']
};


八、开发时间表（14 周）

阶段 周期 目标

Phase 0：基础设施 第 1 周 Gitee 仓库、CI/CD、Vercel+Render+Zeabur 部署、数据库连接

Phase 1：MVP 第 2-5 周 用户注册登录、课程 CRUD、课程列表/详情、个人中心

Phase 2：学习体验 第 6-8 周 课时系统、选课、播放器、学习进度追踪

Phase 3：互动运营 第 9-11 周 评价、讨论区、通知、管理后台

Phase 4：打磨上线 第 12-14 周 性能优化、国际化完善、安全审计、正式上线 v1.0

九、数据库模型清单

模型 表名 说明

User users 用户（student/teacher/admin）

Course courses 课程

Lesson lessons 课时

Category categories 课程分类

Enrollment course_enrollments 选课记录

Review reviews 课程评价

Progress lesson_progress 学习进度

Discussion discussions 讨论帖

Reply replies 讨论回复

Notification notifications 通知

以上就是精简版 Skill 文档的全部内容。你可以全选复制，保存为 OpenEDU_Skill_Document.md 文件，放到项目 docs/ 目录下即可。