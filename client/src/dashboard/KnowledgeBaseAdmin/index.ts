import DashboardManager from '../../utils/DashboardManager';
import type { DashboardEntry } from '../../utils/DashboardManager';
import KnowledgeBaseAdmin from './KnowledgeBaseAdmin.tsx';

const KnowledgeBaseAdminEntry: DashboardEntry = {
  id: 'KnowledgeBaseAdmin',
  title: (t: (key: string) => string) => t('Dashboard.KnowledgeBaseAdmin.title'),
  description: (t: (key: string) => string) => t('Dashboard.KnowledgeBaseAdmin.description'),
  icon: '🖼️',
  component: KnowledgeBaseAdmin,
};

DashboardManager.register(KnowledgeBaseAdminEntry);

export default KnowledgeBaseAdmin;
