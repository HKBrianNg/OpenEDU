// desktop/src/pages/SportVideo/components/VideoModal.tsx
import { Modal } from 'antd';
import { useLocale } from '../../../../store/LocaleContext';
import type { SportItem } from '../types';

interface Props {
  open: boolean;
  item: SportItem | null;
  onClose: () => void;
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? match[1] : null;
}

export function VideoModal({ open, item, onClose }: Props) {
  const { t, locale } = useLocale();

  if (!item) return null;
  const vid = extractYoutubeId(item.url);

  const displayTitle = locale.startsWith('zh') ? item.chineseName : item.englishName;

  if (!vid) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        destroyOnHidden
        footer={null}
        width={480}
        title={displayTitle}
      >
        <p style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>
          {t('sportsVideo.cannotEmbed')}
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      destroyOnHidden
      footer={null}
      width={900}
      title={displayTitle}
    >
      <div style={{ aspectRatio: '16 / 9' }}>
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube-nocookie.com/embed/${vid}`}
          title={displayTitle}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </Modal>
  );
}