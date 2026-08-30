import React from 'react';
import { useLocale } from '../../store/LocaleContext';

interface Props {
  current: number;
  total: number;
  elapsedSec: number;
  estimatedRemainingSec: number;
  losses: { batch: string; value: number }[];
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const TrainingStatus: React.FC<Props> = ({ current, total, elapsedSec, estimatedRemainingSec, losses }) => {
  const { t } = useLocale();
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, border: '1px solid #ddd', marginTop: 12 }}>
      <h3 style={{ margin: '0 0 10px' }}>📊 {t('jungleLab.status.title')}</h3>
      <div style={{ fontSize: 14, lineHeight: 1.8 }}>
        <div>{t('jungleLab.status.current')}: {current}/{total} {t('jungleLab.status.games')}</div>
        <div>{t('jungleLab.status.elapsed')}: {fmtTime(elapsedSec)}</div>
        <div>{t('jungleLab.status.remaining')}: {fmtTime(estimatedRemainingSec)}</div>
      </div>

      <div style={{ margin: '8px 0', height: 8, background: '#e0e0e0', borderRadius: 4 }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: '#4caf50', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>

      {losses.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{t('jungleLab.status.lossRecords')}:</div>
          <div style={{ maxHeight: 140, overflowY: 'auto', fontSize: 12 }}>
            {losses.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span>{l.batch}</span>
                <span>{l.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
          {losses.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#888' }}>
              {t('jungleLab.status.trend')}: ████████░░ {losses[losses.length - 1].value.toFixed(2)} ↓
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrainingStatus;