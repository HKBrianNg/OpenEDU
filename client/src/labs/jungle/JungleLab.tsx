// client/src/labs/jungle/JungleLab.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import JungleBoard from './JungleBoard';
import ParamPanel from './ParamPanel';
import TrainingStatus from './TrainingStatus';
import { startTrain, getSessions, getRecordBySession, api } from './jungleApi';
import type { Session, RecordDetail, MoveRecord } from './jungleApi';
import { useLocale } from '../../store/LocaleContext';

function moveText(m: MoveRecord, index: number): string {
  const dr = m.to_row - m.from_row;
  const dc = m.to_col - m.from_col;
  const dir = dr === -1 ? '↑' : dr === 1 ? '↓' : dc === -1 ? '←' : dc === 1 ? '→' : '?';
  return `${index + 1}. ${m.side === 0 ? '🔴' : '🔵'} ${dir} (${m.from_row},${m.from_col}→${m.to_row},${m.to_col})`;
}

// 解析 moves_json 的工具函数
function parseMoves(raw: MoveRecord[] | string | null | undefined): MoveRecord[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw) as MoveRecord[];
  } catch {
    return [];
  }
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px', fontSize: 16, cursor: 'pointer',
  border: '1px solid #ccc', borderRadius: 4, background: '#fff',
};

const JungleLab: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const { t } = useLocale();

  // 参数
  const [mctsIterations, setMctsIterations] = useState(20);
  const [maxDepth, setMaxDepth] = useState(6);
  const [numGames, setNumGames] = useState(1);
  const [running, setRunning] = useState(false);
  const [pendingStep, setPendingStep] = useState<number | null>(null);

  // 训练状态
  const [currentGames, setCurrentGames] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
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
  const currentGamesRef = useRef(currentGames);

  useEffect(() => {
    currentGamesRef.current = currentGames;
  }, [currentGames]);

  // 初始化
  useEffect(() => {
    getSessions().then(data => setSessions(data.sessions ?? [])).catch(() => {});
  }, []);

  const stopTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPollingSessions = () => {
    if (pollRef.current) return;

    getSessions()
      .then(data => {
        const list = data.sessions ?? [];
        setSessions(list);
        const latest = list[0];
        if (latest) {
          setCurrentGames(latest.games_count ?? 0);
        }
      })
      .catch(() => {});

    pollRef.current = setInterval(async () => {
      try {
        const data = await getSessions();
        const list = data.sessions ?? [];
        setSessions(list);

        const latest = list[0];
        if (latest) {
          const games = latest.games_count ?? 0;
          setCurrentGames(games);

          if (latest.status === 'finished' || latest.status === 'done') {
            setRunning(false);
            stopTimers();
          }
        }
      } catch {}
    }, 2000);
  };

  // 开始训练
  const handleStart = useCallback(async () => {
    stopTimers();

    setRunning(true);
    setCurrentGames(0);
    setLosses([]);
    startTimeRef.current = Date.now();
    setElapsedSec(0);

    timerRef.current = setInterval(() => {
      const e = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSec(e);
    }, 1000);

    startPollingSessions();

    try {
      await startTrain({ num_games: numGames, mcts_iterations: mctsIterations });

      // 训练完成后，继续轮询确认最终状态
      let retries = 0;
      const confirmTimer = setInterval(async () => {
        retries++;
        try {
          const data = await getSessions();
          const list = data.sessions ?? [];
          setSessions(list);
          const latest = list[0];
          if (latest) {
            setCurrentGames(latest.games_count ?? numGames);
            if (latest.status === 'finished' || latest.status === 'done' || retries >= 5) {
              clearInterval(confirmTimer);
              setRunning(false);
              stopTimers();
            }
          }
        } catch {
          if (retries >= 5) {
            clearInterval(confirmTimer);
            setRunning(false);
            stopTimers();
          }
        }
      }, 500);
    } catch {
      setRunning(false);
      stopTimers();
    }
  }, [numGames, mctsIterations]);

  const handleStop = useCallback(async () => {
    try {
      await api.post('/api/labs/jungle/stop-train');
    } catch (e) {
      console.error('停止训练失败', e);
    }
    setRunning(false);
    stopTimers();
  }, []);

  const handleReset = useCallback(() => {
    stopTimers();
    setCurrentGames(0);
    setElapsedSec(0);
    setLosses([]);
    setCurrentStep(0);
    setPlaying(false);
  }, []);

  // 解析当前记录的 moves
  const parsedMoves = parseMoves(selectedRecord?.moves_json ?? selectedRecord?.moves);
  const hasMoves = parsedMoves.length > 0;

  // 回放控制
  const stepDelayMs = speed * 1000;

  useEffect(() => {
    if (!playing || !selectedRecord) return;

    if (currentStep >= parsedMoves.length) {
      setPlaying(false);
      setPendingStep(null);
      return;
    }

    const nextStep = currentStep + 1;
    setPendingStep(nextStep);

    const t = setTimeout(() => {
      setCurrentStep(nextStep);
      setPendingStep(null);
    }, stepDelayMs);

    return () => clearTimeout(t);
  }, [playing, currentStep, selectedRecord, parsedMoves.length, stepDelayMs]);

  const handlePlayPause = useCallback(() => {
    if (!selectedRecord || parsedMoves.length === 0) return;
    if (currentStep >= parsedMoves.length) setCurrentStep(0);
    setPlaying(p => !p);
  }, [selectedRecord, parsedMoves.length, currentStep]);

  const handleNext = useCallback(() => {
    if (!selectedRecord) return;
    setCurrentStep(s => Math.min(parsedMoves.length, s + 1));
  }, [selectedRecord, parsedMoves.length]);

  const handleFirst = useCallback(() => setCurrentStep(0), []);
  const handleLast = useCallback(() => {
    if (!selectedRecord) return;
    setCurrentStep(parsedMoves.length);
  }, [selectedRecord, parsedMoves.length]);

  // 选择棋谱记录时打印原始数据
 const handleSelectRecord = useCallback(async (sessionId: number) => {
    try {
      const rec = await getRecordBySession(sessionId);
      console.log('原始棋谱数据:', JSON.stringify(rec, null, 2));
      setSelectedRecord(rec);
      setCurrentStep(0);
      setPlaying(false);
    } catch (e) {
      console.error('获取棋谱失败', sessionId, e);
    }
  }, []);

  return (
    <div style={{ padding: '12px 24px', maxWidth: 1000, margin: '0 auto' }}>
      {/* 标题 + 返回按钮 + 清空按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 660 }}>
          🧪 {t('lab.jungle.title')}
        </h2>
        {onExit && (
          <button
            onClick={onExit}
            style={{
              padding: '4px 14px',
              cursor: 'pointer',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {t('jungleLab.btn.back') ?? '返回实验室列表'}
          </button>
        )}
        <button
          onClick={async () => {
            if (!window.confirm('确定清空所有对弈记录？')) return;
            try {
              const res = await api.post('/api/labs/jungle/clear-all');
              if (res.status === 200) {
                setSessions([]);
                setSelectedRecord(null);
                setCurrentStep(0);
                setPlaying(false);
              }
            } catch (e) {
              console.error('清空失败', e);
            }
          }}
          style={{
            padding: '4px 14px',
            cursor: 'pointer',
            fontSize: 13,
            lineHeight: 1.6,
            color: '#d32f2f',
            border: '1px solid #d32f2f',
            borderRadius: 4,
            background: '#fff',
          }}
        >
          🗑 清空记录
        </button>
      </div>

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
            losses={losses}
          />
        </div>

        {/* 右栏：棋谱回放区域 */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            overflow: 'hidden',
            background: '#fff',
          }}>
            {/* 棋谱标题 + 统计信息 */}
            <div style={{
              padding: '10px 16px',
              background: '#fafafa',
              borderBottom: '1px solid #ddd',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                📜 {t('jungleLab.replay.title')}
              </h3>
              <div style={{ fontSize: 13, color: '#555' }}>
                {selectedRecord
                  ? `#${selectedRecord.id} · ${selectedRecord.ply_count}${t('jungleLab.replay.step')} · ${selectedRecord.result}`
                  : t('jungleLab.replay.select')}
              </div>
            </div>

            {/* 棋盘 + 右侧列表 */}
            <div style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              padding: 16,
            }}>
              <JungleBoard moves={parsedMoves} currentStep={currentStep} pendingStep={pendingStep}/>

              {/* 右侧：训练记录 + 棋步列表 */}
              <div style={{ width: 225, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* 训练记录 */}
                <div>
                  <div style={{ fontWeight: 640, marginBottom: 4, fontSize: 13 }}>
                    📜 {t('jungleLab.records.title') ?? '训练记录'}
                  </div>
                  <div
                    style={{
                      maxHeight: 140,
                      overflowY: 'auto',
                      border: '1px solid #e0e0e0',
                      borderRadius: 6,
                      padding: 6,
                      background: '#fafafa',
                      fontSize: 11,
                      lineHeight: 1.46,
                    }}
                  >
                    {sessions.length === 0 ? (
                      <div style={{ opacity: 0.55 }}>{t('jungleLab.replay.noRecords') ?? '暂无训练记录'}</div>
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

                {/* 棋步列表 */}
                <div
                  style={{
                    height: 165,
                    overflowY: 'auto',
                    border: '1px solid #eee',
                    borderRadius: 6,
                    padding: 6,
                    background: '#fff',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    lineHeight: 1.43,
                  }}
                >
                  {!hasMoves && (
                    <div style={{ color: '#999' }}>{t('jungleLab.replay.noMoves')}</div>
                  )}
                  {parsedMoves.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        cursor: 'default',
                        padding: '2px 4px',
                        borderRadius: 2,
                        background: i + 1 === currentStep ? '#e3f2fd' : 'transparent',
                        fontWeight: i + 1 === currentStep ? 670 : 410,
                      }}
                    >
                      {moveText(m, i)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 播放控制按钮 + 步数显示 */}
            <div style={{
              padding: '10px 16px',
              background: '#fafafa',
              borderTop: '1px solid #ddd',
              display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13, marginRight: 8, minWidth: 115, color: '#333' }}>
                第 {currentStep} / {parsedMoves.length} 步
                {pendingStep != null ? ` · 预告 ${pendingStep}` : ''}
              </span>

              <button onClick={handleFirst} disabled={!hasMoves} style={btnStyle}>⏮</button>
              <button onClick={handlePlayPause} disabled={!hasMoves} style={btnStyle}>
                {playing ? '⏸' : '▶'}
              </button>
              <button onClick={handleNext} disabled={!hasMoves || currentStep >= parsedMoves.length} style={btnStyle}>▶▶</button>
              <button onClick={handleLast} disabled={!hasMoves || currentStep >= parsedMoves.length} style={btnStyle}>⏭</button>

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
      </div>

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