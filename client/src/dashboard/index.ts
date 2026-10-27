// client/src/dashboard/index.ts
//
// 仪表板的入口注册。
//
// 这里原先还注册了「管理控制台」和「用户管理」两张卡 —— 那两块是**管理**性质的东西，
// 已迁到 tools 桌面端（tools/src/renderer/admin/），不再随网页发布给所有使用者。
// 仪表演板现在只放「登录即可看」的个人内容。

import DashboardManager from '../utils/DashboardManager';
import type { DashboardEntry } from '../utils/DashboardManager';
import LearningResults from '../home/learningresults/LearningResults';

const LearningResultsEntry: DashboardEntry = {
  id: 'LearningResults',
  title: (t: (key: string) => string) => t('learningresults.title'),
  description: (t: (key: string) => string) => t('learningresults.description'),
  icon: '🏆',
  component: LearningResults,
};

DashboardManager.register(LearningResultsEntry);

export default DashboardManager;
