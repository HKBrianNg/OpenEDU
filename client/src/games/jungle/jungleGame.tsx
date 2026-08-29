// client/src/games/jungle/jungleGame.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale } from '../../store/LocaleContext';
import type { Board, Pos } from './jungleTypes';
import { Side, GameStatus } from './jungleTypes';
import { createInitialBoard, getValidMoves } from './jungleRules';
import JungleBoard from './jungleBoard';

interface Props {
  onExit?: () => void;
}

const BACKEND_URL = import.meta.env.VITE_API_BASE;

// 後端 board（side 為 0/1）轉為前端 board（side 為 'red'/'blue'）
function convertBoard(backendBoard: any[][]): Board {
  return backendBoard.map(row =>
    row.map(cell => {
      if (!cell) return null;
      return {
        animal: cell.animal,
        side: cell.side === 0 ? Side.RED : Side.BLUE,
        id: cell.id ?? `${cell.animal}-${cell.side}-${Date.now()}-${Math.random()}`,
      };
    })
  );
}

const JungleGame: React.FC<Props> = ({ onExit }) => {
  const { locale, t } = useLocale();
  const [board, setBoard] = useState<Board>(createInitialBoard);
  const [currentSide, setCurrentSide] = useState<Side>(Side.RED);
  const [selectedPos, setSelectedPos] = useState<Pos | null>(null);
  const [validMoves, setValidMoves] = useState<Pos[]>([]);
  const [status, setStatus] = useState<string>(GameStatus.PLAYING);
  const [message, setMessage] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [gameId, setGameId] = useState<string | null>(null);
  const currentLocale = locale as 'zh' | 'en';

  const statusRef = useRef(status);
  const sideRef = useRef(currentSide);
  useEffect(() => {
    statusRef.current = status;
    sideRef.current = currentSide;
  }, [status, currentSide]);

  // 初始化新遊戲
  const startNewGame = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/games/jungle/init`, {
        method: 'POST',
      });
      const data = await res.json();
      setGameId(data.game_id);
      setBoard(convertBoard(data.board));
      setCurrentSide(Side.RED);
      setSelectedPos(null);
      setValidMoves([]);
      setStatus(GameStatus.PLAYING);
      setMessage('');
    } catch (err) {
      console.error('Failed to start game:', err);
      setMessage('無法連接到後端');
    }
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // 玩家走棋
  const makeMove = useCallback(async (from: Pos, to: Pos) => {
    if (!gameId) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/games/jungle/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          from_row: from.row,
          from_col: from.col,
          to_row: to.row,
          to_col: to.col,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail || '走棋失敗');
        return;
      }

      setBoard(convertBoard(data.board));
      setCurrentSide(data.turn === 0 ? Side.RED : Side.BLUE);
      setSelectedPos(null);
      setValidMoves([]);

      if (data.status === 'red_wins') {
        setStatus(GameStatus.RED_WIN);
        setMessage(t('jungle.redWin'));
      } else if (data.status === 'blue_wins') {
        setStatus(GameStatus.BLUE_WIN);
        setMessage(t('jungle.blueWin'));
      }
    } catch (err) {
      console.error('Move failed:', err);
      setMessage('走棋請求失敗');
    }
  }, [gameId, t]);

  // AI 走棋
  const triggerAIMove = useCallback(async () => {
    if (!gameId || status !== GameStatus.PLAYING) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/games/jungle/ai-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('AI move failed:', data);
        return;
      }

      // AI 認輸
      if (data.last_move?.resign) {
        setStatus(GameStatus.RED_WIN);
        setMessage(t('jungle.redWin'));
        return;
      }

      setBoard(convertBoard(data.board));
      setCurrentSide(data.turn === 0 ? Side.RED : Side.BLUE);

      if (data.status === 'red_wins') {
        setStatus(GameStatus.RED_WIN);
        setMessage(t('jungle.redWin'));
      } else if (data.status === 'blue_wins') {
        setStatus(GameStatus.BLUE_WIN);
        setMessage(t('jungle.blueWin'));
      }
    } catch (err) {
      console.error('AI move failed:', err);
    }
  }, [gameId, status, difficulty, t]);

  // 輪到 AI 時自動觸發
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    if (currentSide !== Side.BLUE) return;

    const timer = setTimeout(() => {
      if (statusRef.current !== GameStatus.PLAYING || sideRef.current !== Side.BLUE) return;
      triggerAIMove();
    }, 500);

    return () => clearTimeout(timer);
  }, [currentSide, status, triggerAIMove]);

  const handleCellClick = (pos: Pos) => {
    if (status !== GameStatus.PLAYING) return;
    if (currentSide !== Side.RED) return;

    const piece = board[pos.row][pos.col];
    if (piece && piece.side === Side.RED) {
      setSelectedPos(pos);
      setValidMoves(getValidMoves(board, pos, Side.RED));
      return;
    }

    if (selectedPos && validMoves.some(m => m.row === pos.row && m.col === pos.col)) {
      makeMove(selectedPos, pos);
      return;
    }

    setSelectedPos(null);
    setValidMoves([]);
  };

  const resetGame = () => {
    startNewGame();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '12px 8px',
        minHeight: '100vh',
        background: '#f3f4f6',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1f2937' }}>
        {t('jungle.title')}
      </h2>

      <div style={{ display: 'flex', gap: 6 }}>
        {(['easy', 'medium', 'hard'] as const).map(d => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            style={{
              padding: '4px 12px',
              background: difficulty === d ? '#2563eb' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难'}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: '8px 21px',
          borderRadius: 10,
          background: status === GameStatus.PLAYING ? '#1f2937' : '#dc2626',
          color: 'white',
          fontSize: 17,
          fontWeight: 650,
        }}
      >
        {status === GameStatus.PLAYING
          ? currentSide === Side.RED
            ? t('jungle.yourTurn')
            : t('jungle.aiThinking')
          : message}
      </div>

      <JungleBoard
        board={board}
        selectedPos={selectedPos}
        validMoves={validMoves}
        side={currentSide}
        locale={currentLocale}
        onCellClick={handleCellClick}
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={resetGame}
          style={{
            padding: '10px 24px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 750,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          {t('jungle.newGame')}
        </button>
        <button
          onClick={onExit}
          style={{
            padding: '10px 24px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 750,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          {t('jungle.exit')}
        </button>
      </div>
    </div>
  );
};

export default JungleGame;