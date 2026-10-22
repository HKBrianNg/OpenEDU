// client/src/books/EnglishVideo/components/LearningModal.tsx
//
// 台词学习：中英对照逐句列出，可逐句朗读，可一键隐藏英文自测。

import { useState } from 'react';
import { Button, Modal, Switch } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import { useSpeech } from '../../EnglishWord/hooks/useSpeech';
import type { TranscriptLine, VideoItem } from '../types';

interface LearningModalProps {
  item: VideoItem | null;
  lines: TranscriptLine[];
  open: boolean;
  onClose: () => void;
}

/** 主体单独抽出来，靠 key 重建来重置「显示英文」开关 */
function LearnBody({ lines }: { lines: TranscriptLine[] }) {
  const { t } = useLocale();
  const { speakingId, speak } = useSpeech();
  const [showEn, setShowEn] = useState(true);

  if (lines.length === 0) {
    return <div style={{ padding: '20px 0', color: '#888' }}>{t('englishVideo.transcriptEmpty')}</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Switch
          checked={showEn}
          onChange={setShowEn}
          checkedChildren={t('englishVideo.showEn')}
          unCheckedChildren={t('englishVideo.hideEn')}
        />
      </div>

      <div style={{ maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
        {lines.map((line) => {
          const active = speakingId === String(line.index);
          return (
            <div
              key={line.index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 8,
                background: active ? '#e8f2ff' : '#fafbfc',
                border: '1px solid',
                borderColor: active ? '#b9d6ff' : '#f0f0f0',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{line.zh}</div>
                <div
                  style={{
                    fontSize: 15,
                    color: showEn ? '#222' : '#ccc',
                    lineHeight: 1.5,
                    fontWeight: 500,
                  }}
                >
                  {showEn ? line.en : '••••••'}
                </div>
              </div>
              <Button
                size="small"
                onClick={() => speak(line.en, 'en-US', String(line.index))}
                style={{ borderRadius: 99, flexShrink: 0 }}
                title={t('englishVideo.speak')}
              >
                {active ? '⏸' : '🔊'}
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function LearningModal({ item, lines, open, onClose }: LearningModalProps) {
  const { t } = useLocale();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      title={item ? `${item.englishName} · ${t('englishVideo.learnTitle')}` : ''}
      destroyOnHidden
    >
      {item && <LearnBody key={`${item.id}-${String(open)}`} lines={lines} />}
    </Modal>
  );
}
