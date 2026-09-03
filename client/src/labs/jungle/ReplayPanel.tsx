import React from 'react';
import { useLocale } from '../../store/LocaleContext';
import type { RecordDetail, MoveRecord } from './jungleApi';

interface Props {
  record: RecordDetail | null;
  currentStep: number;
  playing: boolean;
  speed: number;
  onSelectStep: (step: number) => void;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFirst: () => void;
  onLast: () => void;
  onSpeedChange: (speed: number) => void;
}

function moveText(m: MoveRecord, index: number): string {
  const dr = m.to_row - m.from_row;
  const dc = m.to_col - m.from_col;
  const dir = dr === -1 ? '↑' : dr === 1 ? '↓' : dc === -1 ? '←' : dc === 1 ? '→' : '?';
  return `${index + 1}. ${m.side === 0 ? '🔵' : '🔴'} ${dir} (${m.from_row},${m.from_col}→${m.to_row},${m.to_col})`;
}

function parseMoves(raw: MoveRecord[] | string | null | undefined): MoveRecord[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw) as MoveRecord[];
  } catch {
    return [];
  }
}

const ReplayPanel: React.FC<Props> = ({
  record, currentStep, playing, speed,
  onSelectStep, onPlayPause, onPrev, onNext, onFirst, onLast, onSpeedChange,
}) => {
  const { t } = useLocale();
  const moves = parseMoves(record?.moves_json ?? record?.moves);

  return (
    <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, border: '1px solid #ddd', marginTop: 12 }}>
      {/* 标题 + 棋谱信息 */}
      <h3 style={{ margin: '0 0 10px' }}>📜 {t('jungleLab.replay.title')}</h3>

      <div style={{ fontSize: 13, marginBottom: 8, color: '#555' }}>
        {record
          ? `#${record.id} · ${record.ply_count}${t('jungleLab.replay.step')} · ${record.result}`
          : t('jungleLab.replay.select')}
      </div>

      {/* 棋谱列表（走法） */}
      <div style={{
        fontSize: 12, maxHeight: 180, overflowY: 'auto', background: '#fff',
        borderRadius: 4, padding: 8, fontFamily: 'monospace',
        marginBottom: 10,
      }}>
        {moves.length === 0 && <div style={{ color: '#999' }}>{t('jungleLab.replay.noMoves')}</div>}
        {moves.map((m, i) => (
          <div key={i} onClick={() => onSelectStep(i + 1)}
            style={{
              cursor: 'pointer', padding: '2px 4px', borderRadius: 2,
              background: i + 1 === currentStep ? '#e3f2fd' : 'transparent',
              fontWeight: i + 1 === currentStep ? 700 : 400,
            }}>
            {moveText(m, i)}
          </div>
        ))}
      </div>

      {/* 播放控制按钮 + 速度选择 */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onFirst} disabled={moves.length === 0} style={btnStyle}>⏮</button>
        <button onClick={onPrev} disabled={currentStep <= 0} style={btnStyle}>◀</button>
        <button onClick={onPlayPause} disabled={moves.length === 0} style={btnStyle}>
          {playing ? '⏸' : '▶'}
        </button>
        <button onClick={onNext} disabled={currentStep >= moves.length} style={btnStyle}>▶▶</button>
        <button onClick={onLast} disabled={currentStep >= moves.length} style={btnStyle}>⏭</button>
        <select value={speed} onChange={e => onSpeedChange(Number(e.target.value))}
          style={{ marginLeft: 4, padding: 4, fontSize: 12 }}>
          <option value={0.5}>0.5s</option>
          <option value={1}>1s</option>
          <option value={2}>2s</option>
          <option value={3}>3s</option>
        </select>
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  padding: '4px 10px', fontSize: 16, cursor: 'pointer',
  border: '1px solid #ccc', borderRadius: 4, background: '#fff',
};

export default ReplayPanel;