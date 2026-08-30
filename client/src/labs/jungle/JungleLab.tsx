import React, { useState, useEffect, useCallback, useRef } from 'react';
import JungleBoard from './JungleBoard';
import ParamPanel from './ParamPanel';
import TrainingStatus from './TrainingStatus';
import TrainingRecords from './TrainingRecords';
import ReplayPanel from './ReplayPanel';
import { startTrain, getSessions, getRecord } from './jungleApi';
import type { Session, RecordDetail } from './jungleApi';
import { useLocale } from '../../store/LocaleContext';

const JungleLab: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const { t } = useLocale();

  // 参数
  const [mctsIterations, setMctsIterations] = useState(80);
  const [maxDepth, setMaxDepth] = useState(6);
  const [numGames, setNumGames] = useState(500);
  const [running, setRunning] = useState(false);

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
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载训练记录
  useEffect(() => {
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
  useEffect(() => {
    if (playing && selectedRecord) {
      playTimerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= (selectedRecord?.moves.length ?? 0)) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed * 1000);
    }
    return () => clearInterval(playTimerRef.current!);
  }, [playing, selectedRecord, speed]);

  const handleSelectStep = useCallback((step: number) => {
    setCurrentStep(step);
    setPlaying(false);
  }, []);

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

  const handleSelectRecord = useCallback(async (recId: number) => {
    try {
      const rec = await getRecord(recId);
      setSelectedRecord(rec);
      setCurrentStep(0);
      setPlaying(false);
    } catch {}
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 20 }}>🧪 {t('lab.jungle.title')}</h1>

      <div className="jungle-layout" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 440px) 1fr',
        gap: 24,
      }}>
        {/* 左栏 */}
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

          <TrainingRecords
            sessions={sessions}
            onSelectSession={s => {
              if (s.id) handleSelectRecord(s.id);
            }}
          />

          <ReplayPanel
            record={selectedRecord}
            currentStep={currentStep}
            playing={playing}
            speed={speed}
            onSelectStep={handleSelectStep}
            onPlayPause={handlePlayPause}
            onPrev={handlePrev}
            onNext={handleNext}
            onFirst={handleFirst}
            onLast={handleLast}
            onSpeedChange={setSpeed}
          />
        </div>

        {/* 右栏 */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          paddingTop: 20, minWidth: 0,
        }}>
          <JungleBoard moves={selectedRecord?.moves ?? []} currentStep={currentStep} />
        </div>
      </div>

      {onExit && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={onExit} style={{ padding: '8px 36px', cursor: 'pointer' }}>
            {t('jungleLab.btn.back')}
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 899px) {
          .jungle-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default JungleLab;