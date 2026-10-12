import DashboardManager from '../../utils/DashboardManager';
import type { DashboardEntry } from '../../utils/DashboardManager';
import SongAdmin from './SongAdmin';

const SongAdminEntry: DashboardEntry = {
  id: 'SongAdmin',
  title: (t: (key: string) => string) => t('Dashboard.SongAdmin.title'),
  description: (t: (key: string) => string) => t('Dashboard.SongAdmin.description'),
  icon: '🎵',
  component: SongAdmin,
};

DashboardManager.register(SongAdminEntry);

export default SongAdmin;
