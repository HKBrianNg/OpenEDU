import React from 'react';
import { useLocale } from '../../store/LocaleContext';

interface Props {
  mctsIterations: number;
  maxDepth: number;
  numGames: number;
  onChange: (key: string, val: number) => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  running: boolean;
}

const ParamPanel: React.FC<Props> = ({
  mctsIterations, maxDepth, numGames,
  onChange, onStart, onStop, onReset, running,
}) => {
  const { t } = useLocale();

  return (
    <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, border: '1px solid #ddd' }}>
      <h3 style={{ margin: '0 0 12px' }}>⚙️ {t('jungleLab.params.title')}</h3>

      <LabelSlider label={t('jungleLab.params.mctsIterations')} value={mctsIterations}
        min={10} max={500} step={10} onChange={v => onChange('mctsIterations', v)} />
      <LabelSlider label={t('jungleLab.params.maxDepth')} value={maxDepth}
        min={1} max={20} step={1} onChange={v => onChange('maxDepth', v)} />
      <LabelSlider label={t('jungleLab.params.numGames')} value={numGames}
        min={1} max={2000} step={1} onChange={v => onChange('numGames', v)} />

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onStart} disabled={running}
          style={{ flex: 1, padding: '6px 0', cursor: running ? 'not-allowed' : 'pointer' }}>
          ▶ {t('jungleLab.params.start')}
        </button>
        <button onClick={onStop} disabled={!running}
          style={{ flex: 1, padding: '6px 0', cursor: !running ? 'not-allowed' : 'pointer' }}>
          ⏹ {t('jungleLab.params.stop')}
        </button>
        <button onClick={onReset}
          style={{ flex: 1, padding: '6px 0', cursor: 'pointer' }}>
          🔄 {t('jungleLab.params.reset')}
        </button>
      </div>

      <div style={{ marginTop: 12, padding: 10, background: '#f0f0f0', borderRadius: 6, fontSize: 13, color: '#555' }}>
        <strong>{t('jungleLab.params.reference')}</strong><br />
        {t('jungleLab.params.fast')}<br />
        {t('jungleLab.params.standard')}<br />
        {t('jungleLab.params.deep')}
      </div>
    </div>
  );
};

function LabelSlider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%' }} />
    </div>
  );
}

export default ParamPanel;