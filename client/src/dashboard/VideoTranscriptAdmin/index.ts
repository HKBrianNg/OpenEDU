import DashboardManager from '../../utils/DashboardManager';
import type { DashboardEntry } from '../../utils/DashboardManager';
import VideoTranscriptAdmin from './VideoTranscriptAdmin.tsx';

const VideoTranscriptAdminEntry: DashboardEntry = {
  id: 'VideoTranscriptAdmin',
  title: (t: (key: string) => string) => t('Dashboard.VideoTranscriptAdmin.title'),
  description: (t: (key: string) => string) =>
    t('Dashboard.VideoTranscriptAdmin.description'),
  icon: '🎬',
  component: VideoTranscriptAdmin,
};

DashboardManager.register(VideoTranscriptAdminEntry);

export default VideoTranscriptAdmin;
