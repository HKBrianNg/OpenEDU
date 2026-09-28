// client/src/labs/jungle/TrainingRecords.tsx

import React from 'react';
import { useLocale } from '../../store/LocaleContext';
import type { Session } from './jungleApi';

interface Props {
  sessions: Session[];
  onSelectSession: (s: Session) => void;
}

function parseTimestamp(v: string | number | undefined | null): number {
  if (v == null) return NaN;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return NaN;
  // 后端是秒级时间戳（可能带小数），小于 10^12 当作秒处理
  return n < 1e12 ? n * 1000 : n;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fmtDateTime(dateValue: string | number | undefined | null): string {
  const ms = parseTimestamp(dateValue);
  if (Number.isNaN(ms)) return '-';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseConfigJson(v: string | object | undefined | null): Record<string, unknown> {
  if (!v) return {};
  if (typeof v === 'object') {
    return v as Record<string, unknown>;
  }
  try {
    return JSON.parse(v) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const TrainingRecords: React.FC<Props> = ({ sessions, onSelectSession }) => {
  const { t } = useLocale();

  return (
    <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, border: '1px solid #ddd', marginTop: 12 }}>
      <h3 style={{ margin: '0 0 10px' }}>📋 {t('jungleLab.records.title')}</h3>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {sessions.length === 0 && (
          <div style={{ color: '#999', fontSize: 13 }}>{t('jungleLab.records.empty')}</div>
        )}
        {sessions.map(s => {
          const config = parseConfigJson(s.config_json);
          const numGames: string | number = config.num_games != null ? String(config.num_games) : '?';
          const gamesCount: string | number = s.games_count != null ? String(s.games_count) : '0';

          return (
            <div
              key={s.id}
              onClick={() => onSelectSession(s)}
              style={{
                cursor: 'pointer',
                padding: '6px 8px',
                borderBottom: '1px solid #eee',
                fontSize: 13,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span>{fmtDateTime(s.started_at)}</span>
              <span>{numGames}{t('jungleLab.records.games')}</span>
              <span>{gamesCount}{t('jungleLab.records.records')}</span>
              <span style={{ color: s.status === 'finished' ? '#4caf50' : '#ff9800' }}>
                {s.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrainingRecords;