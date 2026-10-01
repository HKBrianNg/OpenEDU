import DashboardManager from '../../utils/DashboardManager';
import type { DashboardEntry } from '../../utils/DashboardManager';
import UserAdmin from './UserAdmin.tsx';

const UserAdminEntry: DashboardEntry = {
  id: 'UserAdmin',
  title: (t: (key: string) => string) => t('Dashboard.UserAdmin.title'),
  description: (t: (key: string) => string) => t('Dashboard.UserAdmin.description'),
  icon: '🤖',
  component: UserAdmin,
};

DashboardManager.register(UserAdminEntry);

export default UserAdmin;