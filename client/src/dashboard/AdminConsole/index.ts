import DashboardManager from '../../utils/DashboardManager';
import type { DashboardEntry } from '../../utils/DashboardManager';
import AdminConsole from './AdminConsole.tsx';

const AdminConsoleEntry: DashboardEntry = {
  id: 'AdminConsole',
  title: (t: (key: string) => string) => t('Dashboard.AdminConsole.title'),
  description: (t: (key: string) => string) => t('Dashboard.AdminConsole.description'),
  icon: '🤖',
  component: AdminConsole,
};

DashboardManager.register(AdminConsoleEntry);

export default AdminConsole;