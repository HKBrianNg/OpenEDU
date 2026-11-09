import { Modal } from 'antd';
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
  if (!item) return null;
  const vid = extractYoutubeId(item.url);
  if (!vid) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      destroyOnHidden
      footer={null}
      width={900}
      title={item.chineseName}
    >
      <div style={{ aspectRatio: '16 / 9' }}>
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube-nocookie.com/embed/${vid}`}
          title={item.chineseName}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </Modal>
  );
}
