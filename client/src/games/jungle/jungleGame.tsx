// client/src/games/jungle/jungleGame.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale } from '../../store/LocaleContext';
import type { Board, Pos } from './jungleTypes';
import { Side, GameStatus } from './jungleTypes';
import { createInitialBoard, getValidMoves, checkWin } from './jungleRules';
import { getAIMove, RESIGN_MOVE } from './jungleAI';
import type { AIDifficulty } from './jungleAI';
import JungleBoard from './jungleBoard';

interface Props {
  onExit?: () => void;
}

const JungleGame: React.FC<Props> = ({ onExit }) => {
  const { locale, t } = useLocale();
  const [board, setBoard] = useState<Board>(createInitialBoard);
  const [currentSide, setCurrentSide] = useState<Side>(Side.RED);
  const [selectedPos, setSelectedPos] = useState<Pos | null>(null);
  const [validMoves, setValidMoves] = useState<Pos[]>([]);
  const [status, setStatus] = useState<string>(GameStatus.PLAYING);
  const [message, setMessage] = useState('');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const currentLocale = locale as 'zh' | 'en';

  const statusRef = useRef(status);
  const sideRef = useRef(currentSide);
  useEffect(() => {
    statusRef.current = status;
    sideRef.current = currentSide;
  }, [status, currentSide]);

  const makeMove = useCallback((from: Pos, to: Pos) => {
    const newBoard = board.map(row => [...row]);
    newBoard[to.row][to.col] = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = null;
    setBoard(newBoard);

    if (checkWin(newBoard, currentSide)) {
      setStatus(currentSide === Side.RED ? GameStatus.RED_WIN : GameStatus.BLUE_WIN);
      setMessage(currentSide === Side.RED ? t('jungle.redWin') : t('jungle.blueWin'));
      return;
    }

    const opponent: Side = currentSide === Side.RED ? Side.BLUE : Side.RED;
    const nextSide = opponent;
    setCurrentSide(nextSide);
    setSelectedPos(null);
    setValidMoves([]);
  }, [board, currentSide, t]);

  // AI走棋
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    if (currentSide !== Side.BLUE) return;

    const timer = setTimeout(() => {
      if (statusRef.current !== GameStatus.PLAYING || sideRef.current !== Side.BLUE) return;
      const move = getAIMove(board, Side.BLUE, difficulty);

      // ✅ AI预判认输
      if (
        move &&
        move.from.row === RESIGN_MOVE.from.row &&
        move.from.col === RESIGN_MOVE.from.col &&
        move.to.row === RESIGN_MOVE.to.row &&
        move.to.col === RESIGN_MOVE.to.col
      ) {
        setStatus(GameStatus.RED_WIN);
        setMessage(t('jungle.redWin'));
        return;
      }

      if (!move) {
        setStatus(GameStatus.RED_WIN);
        setMessage(t('jungle.redWin'));
        return;
      }

      makeMove(move.from, move.to);
    }, 400);

    return () => clearTimeout(timer);
  }, [currentSide, board, status, makeMove, difficulty, t]);

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
    setBoard(createInitialBoard());
    setCurrentSide(Side.RED);
    setSelectedPos(null);
    setValidMoves([]);
    setStatus(GameStatus.PLAYING);
    setMessage('');
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
