import { useEffect, useState } from 'react';
import { Alert, Spin } from 'antd';
import { loadGrade } from '../hooks/useStrokeData';
import StrokeStage from './StrokeStage';
import TraceStage from './TraceStage';
import WriteStage from './WriteStage';
import type { HanziChar, PracticeMode, ScriptMode } from '../types';
import { GRID_SIZE } from '../constants';
import { useLocale } from '../../../store/LocaleContext';

interface PracticeAreaProps {
  entry: HanziChar;
  script: ScriptMode;
  mode: PracticeMode;
  speed: number;
  resetKey: number;
  onReset: () => void;
}

/**
 * 练习区的外壳：先把这一年级的笔画数据备好，再决定把哪种练习塞进田字格。
 * 数据在按年级动态加载，第一次切到某个年级时会有一小段等待。
 */
export default function PracticeArea({
  entry,
  script,
  mode,
  speed,
  resetKey,
  onReset,
}: PracticeAreaProps) {
  const { t } = useLocale();
  // 简繁两套数据分开加载，所以年级 + 字形一起当 key，undefined 就是还没好
  const [status, setStatus] = useState<Record<string, 'ok' | 'fail'>>({});

  useEffect(() => {
    let alive = true;
    const key = `${script}-${entry.grade}`;
    loadGrade(entry.grade, script).then(
      () => {
        if (alive) setStatus((s) => ({ ...s, [key]: 'ok' }));
      },
      () => {
        if (alive) setStatus((s) => ({ ...s, [key]: 'fail' }));
      },
    );
    return () => {
      alive = false;
    };
  }, [entry.grade, script]);

  const state = status[`${script}-${entry.grade}`];

  if (state !== 'ok') {
    return (
      <PracticeGridStub size={GRID_SIZE}>
        {state === 'fail' ? (
          <Alert
            type="error"
            showIcon
            style={{ margin: 12, fontSize: 13 }}
            message={t('hanziwriting.loadFailed')}
          />
        ) : (
          <Spin tip={t('hanziwriting.loadingStrokes')}>
            <div style={{ width: GRID_SIZE, height: GRID_SIZE }} />
          </Spin>
        )}
      </PracticeGridStub>
    );
  }

  if (mode === 'stroke') {
    return (
      <StrokeStage
        entry={entry}
        script={script}
        size={GRID_SIZE}
        speed={speed}
        resetKey={resetKey}
        onReset={onReset}
      />
    );
  }
  if (mode === 'trace') {
    return <TraceStage entry={entry} script={script} size={GRID_SIZE} />;
  }
  return (
    <WriteStage
      entry={entry}
      script={script}
      size={GRID_SIZE}
      resetKey={resetKey}
      onReset={onReset}
    />
  );
}

/** 加载中 / 加载失败时占位的空格子，跟练习区一样大，避免布局跳动 */
function PracticeGridStub({
  size,
  children,
}: {
  size: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}
