import React, { useState, useEffect, useCallback, useRef } from 'react';
import JungleBoard from './JungleBoard';
import ParamPanel from './ParamPanel';
import TrainingStatus from './TrainingStatus';
import { startTrain, getSessions, getRecord } from './jungleApi';
import type { Session, RecordDetail, MoveRecord } from './jungleApi';
import { useLocale } from '../../store/LocaleContext';

// ========== 测试模式开关 ==========
const TEST_MODE = false; // 改成 true 启用测试棋谱

const testMoves: MoveRecord[] = [
  { step: 1, side: 0, from_row: 0, from_col: 0, to_row: 1, to_col: 0 },
  { step: 2, side: 1, from_row: 8, from_col: 0, to_row: 7, to_col: 0 },
  { step: 3, side: 0, from_row: 1, from_col: 0, to_row: 2, to_col: 0 },
];

const testRecord: RecordDetail = {
  id: 0,
  session_id: 0,
  game_index: 0,
  result: '测试棋谱',
  winner_side: null,
  ply_count: 3,
  moves: testMoves,
};
// ==================================

function moveText(m: MoveRecord, index: number): string {
  const dr = m.to_row - m.from_row;
  const dc = m.to_col - m.from_col;
  const dir = dr === -1 ? '↑' : dr === 1 ? '↓' : dc === -1 ? '←' : dc === 1 ? '→' : '?';
  return `${index + 1}. ${m.side === 0 ? '🔵' : '🔴'} ${dir} (${m.from_row},${m.from_col}→${m.to_row},${m.to_col})`;
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px', fontSize: 16, cursor: 'pointer',
  border: '1px solid #ccc', borderRadius: 4, background: '#fff',
};

const JungleLab: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const { t } = useLocale();

  // 参数
  const [mctsIterations, setMctsIterations] = useState(80);
  const [maxDepth, setMaxDepth] = useState(6);
  const [numGames, setNumGames] = useState(500);
  const [running, setRunning] = useState(false);
  const [pendingStep, setPendingStep] = useState<number | null>(null);

  // 训练状态
  const [currentGames, setCurrentGames] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [losses, setLosses] = useState<{ batch: string; value: number }[]>([]);

  // 训练记录
  const [sessions, setSessions] = useState<Session[]>([]);

  // 棋谱回放
  const [selectedRecord, setSelectedRecord] = useState<RecordDetail | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 初始化：测试模式直接加载测试棋谱
  useEffect(() => {
    if (TEST_MODE) {
      setSelectedRecord(testRecord);
      setCurrentStep(0);
      return;
    }
    getSessions().then(data => setSessions(data.sessions ?? [])).catch(() => {});
  }, []);

  // 开始训练
  const handleStart = useCallback(async () => {
    setRunning(true);
    setCurrentGames(0);
    setLosses([]);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const e = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSec(e);
      if (currentGames > 0) {
        const rate = e / currentGames;
        setRemainingSec(Math.max(0, Math.floor((numGames - currentGames) * rate)));
      }
    }, 1000);

    try {
      await startTrain({ num_games: numGames, mcts_iterations: mctsIterations });
      pollRef.current = setInterval(async () => {
        try {
          const data = await getSessions();
          if (data.sessions.length > 0) {
            const latest = data.sessions[0];
            setCurrentGames(latest.games_count);
            if (latest.status === 'finished') {
              setRunning(false);
              clearInterval(timerRef.current!);
              clearInterval(pollRef.current!);
              setSessions(data.sessions);
            }
          }
        } catch {}
      }, 2000);
    } catch {
      setRunning(false);
      clearInterval(timerRef.current!);
    }
  }, [numGames, mctsIterations, currentGames]);

  const handleStop = useCallback(() => {
    setRunning(false);
    clearInterval(timerRef.current!);
    clearInterval(pollRef.current!);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentGames(0);
    setElapsedSec(0);
    setRemainingSec(0);
    setLosses([]);
    setCurrentStep(0);
    setPlaying(false);
  }, []);

  // 回放控制
  // 回放控制：预告→走棋
  const STEP_PREVIEW_MS = 2200;

  useEffect(() => {
    if (!playing || !selectedRecord) return;

    if (currentStep >= selectedRecord.moves.length) {
      setPlaying(false);
      setPendingStep(null);
      return;
    }

    // 进入预告阶段
    const nextStep = currentStep + 1;
    setPendingStep(nextStep);

    const t = setTimeout(() => {
      setCurrentStep(nextStep);
      setPendingStep(null);
    }, STEP_PREVIEW_MS);

    return () => clearTimeout(t);
  }, [playing, currentStep, selectedRecord]);

  const moves = selectedRecord?.moves ?? [];

//   const handleSelectStep = useCallback((step: number) => {
//   if (step > currentStep && step <= moves.length) {
//     setPendingStep(step);
//     setTimeout(() => {
//       setCurrentStep(step);
//       setPendingStep(null);
//     }, 2200);
//   } else {
//     setCurrentStep(step);
//     setPendingStep(null);
//   }
//   setPlaying(false);
// }, [currentStep, moves.length]);


  const handlePlayPause = useCallback(() => {
    if (!selectedRecord || selectedRecord.moves.length === 0) return;
    if (currentStep >= selectedRecord.moves.length) setCurrentStep(0);
    setPlaying(p => !p);
  }, [selectedRecord, currentStep]);

  const handlePrev = useCallback(() => setCurrentStep(s => Math.max(0, s - 1)), []);
  const handleNext = useCallback(() => {
    if (!selectedRecord) return;
    setCurrentStep(s => Math.min(selectedRecord.moves.length, s + 1));
  }, [selectedRecord]);
  const handleFirst = useCallback(() => setCurrentStep(0), []);
  const handleLast = useCallback(() => {
    if (!selectedRecord) return;
    setCurrentStep(selectedRecord.moves.length);
  }, [selectedRecord]);

  // 选择棋谱记录时打印原始数据
  const handleSelectRecord = useCallback(async (recId: number) => {
    try {
      const rec = await getRecord(recId);
      console.log('原始棋谱数据:', JSON.stringify(rec, null, 2));
      setSelectedRecord(rec);
      setCurrentStep(0);
      setPlaying(false);
    } catch {}
  }, []);

 
  const hasMoves = moves.length > 0;

  return (
    <div style={{ padding: '12px 24px', maxWidth: 1180, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 14px 0', fontSize: 22, fontWeight: 660 }}>
        🧪 {t('lab.jungle.title')} {TEST_MODE ? '(测试模式)' : ''}
      </h2>

      <div className="jungle-layout" style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: 30,
        alignItems: 'start',
      }}>
        {/* 左栏：参数 + 训练状态 */}
        <div style={{ minWidth: 0 }}>
          <ParamPanel
            mctsIterations={mctsIterations}
            maxDepth={maxDepth}
            numGames={numGames}
            onChange={(k, v) => {
              if (k === 'mctsIterations') setMctsIterations(v);
              if (k === 'maxDepth') setMaxDepth(v);
              if (k === 'numGames') setNumGames(v);
            }}
            onStart={handleStart}
            onStop={handleStop}
            onReset={handleReset}
            running={running}
          />

          <TrainingStatus
            current={currentGames}
            total={numGames}
            elapsedSec={elapsedSec}
            estimatedRemainingSec={remainingSec}
            losses={losses}
          />
        </div>

        {/* 右栏：棋谱回放区域 */}
        <div style={{ minWidth: 0 }}>
          {/* 棋谱标题 + 统计信息 */}
          <div style={{
            background: '#fafafa', borderRadius: '8px 8px 0 0', padding: '10px 18px',
            border: '1px solid #ddd', borderBottom: 'none',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              📜 {t('jungleLab.replay.title')}
              {TEST_MODE && <span style={{ fontSize: 11, color: '#f57c00', marginLeft: 8 }}>[测试]</span>}
            </h3>
            <div style={{ fontSize: 13, color: '#555' }}>
              {selectedRecord
                ? `#${selectedRecord.id} · ${selectedRecord.ply_count}${t('jungleLab.replay.step')} · ${selectedRecord.result}`
                : t('jungleLab.replay.select')}
            </div>
          </div>

          {/* 棋盘 + 右侧(训练记录 + 棋步列表) 并排 */}
          <div style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 16,
            border: '1px solid #ddd',
            borderTop: 'none',
            borderBottom: 'none',
            background: '#fff',
          }}>
            <JungleBoard moves={moves} currentStep={currentStep} pendingStep={pendingStep}/>

            {/* 右侧：训练记录 + 棋步列表 */}
            <div style={{ width: 225, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* 训练记录 */}
              <div>
                <div style={{ fontWeight: 640, marginBottom: 4, fontSize: 13 }}>
                  📜 {t('jungleLab.replay.trainingRecords') ?? '训练记录'}
                </div>
                <div
                  style={{
                    maxHeight: 155,
                    overflowY: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: 6,
                    padding: 6,
                    background: '#fafafa',
                    fontSize: 11,
                    lineHeight: 1.48,
                  }}
                >
                  {sessions.length === 0 && !TEST_MODE ? (
                    <div style={{ opacity: 0.58 }}>{t('jungleLab.replay.noRecords') ?? '暂无训练记录'}</div>
                  ) : TEST_MODE ? (
                    <div style={{ opacity: 0.68, fontStyle: 'italic' }}>
                      {t('jungleLab.replay.testMode') ?? '测试模式，使用固定棋谱'}
                    </div>
                  ) : (
                    sessions.map((s, i) => (
                      <div
                        key={s.id ?? i}
                        onClick={() => { if (s.id) handleSelectRecord(s.id); }}
                        style={{
                          cursor: 'pointer',
                          padding: '3px 5px',
                          borderRadius: 3,
                          marginBottom: 2,
                          background: selectedRecord?.id === s.id ? '#e3f2fd' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        #{s.id} · {s.games_count ?? '?'}局 · {s.result ?? s.status}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 棋步列表：高度减半 */}
              <div
                style={{
                  height: 178,
                  overflowY: 'auto',
                  border: '1px solid #eee',
                  borderRadius: 6,
                  padding: 6,
                  background: '#fff',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  lineHeight: 1.44,
                }}
              >
                {!hasMoves && (
                  <div style={{ color: '#999' }}>{t('jungleLab.replay.noMoves')}</div>
                )}
                {moves.map((m, i) => (
                  <div
                    key={i}
                    // onClick={() => handleSelectStep(i + 1)}
                    style={{
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: 2,
                      background: i + 1 === currentStep ? '#e3f2fd' : 'transparent',
                      fontWeight: i + 1 === currentStep ? 690 : 430,
                    }}
                  >
                    {moveText(m, i)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 播放控制按钮 */}
          <div style={{
            background: '#fafafa', borderRadius: '0 0 8px 8px', padding: '10px 18px',
            border: '1px solid #ddd', borderTop: 'none',
            display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <button onClick={handleFirst} disabled={!hasMoves} style={btnStyle}>⏮</button>
            <button onClick={handlePrev} disabled={currentStep <= 0} style={btnStyle}>◀</button>
            <button onClick={handlePlayPause} disabled={!hasMoves} style={btnStyle}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={handleNext} disabled={!hasMoves || currentStep >= moves.length} style={btnStyle}>▶▶</button>
            <button onClick={handleLast} disabled={!hasMoves || currentStep >= moves.length} style={btnStyle}>⏭</button>
            <select value={speed} onChange={e => setSpeed(Number(e.target.value))}
              style={{ marginLeft: 4, padding: 4, fontSize: 12 }}>
              <option value={0.5}>0.5s</option>
              <option value={1}>1s</option>
              <option value={2}>2s</option>
              <option value={3}>3s</option>
            </select>
          </div>
        </div>
      </div>

      {onExit && (
        <div style={{ marginTop: 25, textAlign: 'center' }}>
          <button onClick={onExit} style={{ padding: '8px 46px', cursor: 'pointer', fontSize: 14 }}>
            {t('jungleLab.btn.back')}
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 970px) {
          .jungle-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default JungleLab;