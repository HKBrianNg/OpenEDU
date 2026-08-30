import React from 'react';
import { useLocale } from '../../store/LocaleContext';
import type { Session } from './jungleApi';

interface Props {
  sessions: Session[];
  onSelectSession: (s: Session) => void;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const TrainingRecords: React.FC<Props> = ({ sessions, onSelectSession }) => {
  const { t } = useLocale();

  return (
    <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, border: '1px solid #ddd', marginTop: 12 }}>
      <h3 style={{ margin: '0 0 10px' }}>📋 {t('jungleLab.records.title')}</h3>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {sessions.length === 0 && <div style={{ color: '#999', fontSize: 13 }}>{t('jungleLab.records.empty')}</div>}
        {sessions.map(s => (
          <div key={s.id} onClick={() => onSelectSession(s)}
            style={{
              cursor: 'pointer', padding: '6px 8px', borderBottom: '1px solid #eee', fontSize: 13,
              display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap'
            }}>
            <span>{fmtDate(s.started_at)}</span>
            <span>{s.config_json?.num_games ?? '?'}{t('jungleLab.records.games')}</span>
            <span>{s.games_count}{t('jungleLab.records.records')}</span>
            <span style={{ color: s.status === 'finished' ? '#4caf50' : '#ff9800' }}>{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrainingRecords;