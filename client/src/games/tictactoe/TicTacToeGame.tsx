import React, { useState, useEffect } from 'react';
import { useLocale } from '../../store/LocaleContext';

interface Props {
  onExit?: () => void;
}

type Player = 'X' | 'O';
type Cell = Player | null;

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// ===== Minimax AI =====
const checkWinner = (cells: Cell[]): Player | 'draw' | null => {
  for (const [a, b, c] of WIN_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a] as Player;
    }
  }
  if (cells.every(cell => cell !== null)) return 'draw';
  return null;
};

const minimax = (cells: Cell[], depth: number, isMaximizing: boolean): number => {
  const result = checkWinner(cells);
  if (result === 'O') return 10 - depth;
  if (result === 'X') return depth - 10;
  if (result === 'draw') return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!cells[i]) {
        cells[i] = 'O';
        best = Math.max(best, minimax(cells, depth + 1, false));
        cells[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!cells[i]) {
        cells[i] = 'X';
        best = Math.min(best, minimax(cells, depth + 1, true));
        cells[i] = null;
      }
    }
    return best;
  }
};

const getBestMove = (cells: Cell[]): number => {
  let bestScore = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!cells[i]) {
      cells[i] = 'O';
      const score = minimax(cells, 0, false);
      cells[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
};

// ===== 组件 =====
const TicTacToeGame: React.FC<Props> = ({ onExit }) => {
  const { t } = useLocale();
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 });
  const [gameMode, setGameMode] = useState<'ai' | 'local'>('ai');

  // AI 走棋
  useEffect(() => {
    if (gameMode !== 'ai') return;
    if (currentPlayer !== 'O') return;
    if (winner) return;

    const timer = setTimeout(() => {
      const move = getBestMove([...board]);
      if (move === -1) return;
      makeMove(move);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentPlayer, winner, gameMode]);

  const makeMove = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result);
      setScores(prev => ({
        ...prev,
        [result === 'draw' ? 'draw' : result]: prev[result === 'draw' ? 'draw' : result] + 1,
      }));
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

  const handleClick = (index: number) => {
    if (gameMode === 'ai' && currentPlayer === 'O') return;
    makeMove(index);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
  };

  const resetAll = () => {
    resetGame();
    setScores({ X: 0, O: 0, draw: 0 });
  };

  const switchMode = (mode: 'ai' | 'local') => {
    setGameMode(mode);
    resetGame();
    setScores({ X: 0, O: 0, draw: 0 });
  };

  const getStatusText = () => {
    if (winner === 'draw') return t('tictactoe.draw');
    if (winner) {
      if (gameMode === 'ai') {
        return winner === 'X' ? t('tictactoe.youWin') : t('tictactoe.aiWins');
      }
      return `${winner} ${t('tictactoe.wins')}`;
    }
    if (gameMode === 'ai') {
      return currentPlayer === 'X' ? t('tictactoe.yourTurn') : t('tictactoe.aiThinking');
    }
    return `${currentPlayer} ${t('tictactoe.turn')}`;
  };

  const statusColor = winner === 'draw' ? '#facc15' : winner ? '#4ade80' : '#60a5fa';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        minHeight: '100vh',
        background: '#f3f4f6',
      }}
    >
      {/* 模式切换 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => switchMode('ai')}
          style={{
            padding: '6px 16px',
            background: gameMode === 'ai' ? '#2563eb' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {t('tictactoe.vsAI')}
        </button>
        <button
          onClick={() => switchMode('local')}
          style={{
            padding: '6px 16px',
            background: gameMode === 'local' ? '#2563eb' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {t('tictactoe.local')}
        </button>
      </div>

      {/* 计分板 */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          background: '#1f2937',
          padding: '10px 20px',
          borderRadius: 12,
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <span>
          {gameMode === 'ai' ? t('tictactoe.you') : 'X'}:{' '}
          <span style={{ color: '#60a5fa' }}>{scores.X}</span>
        </span>
        <span style={{ color: '#6b7280' }}>|</span>
        <span>
          {t('tictactoe.draw')}: <span style={{ color: '#facc15' }}>{scores.draw}</span>
        </span>
        <span style={{ color: '#6b7280' }}>|</span>
        <span>
          {gameMode === 'ai' ? 'AI' : 'O'}:{' '}
          <span style={{ color: '#f87171' }}>{scores.O}</span>
        </span>
      </div>

      {/* 状态文字 */}
      <div style={{ color: statusColor, fontSize: 18, fontWeight: 700 }}>
        {getStatusText()}
      </div>

      {/* 棋盘 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 90px)',
          gap: 6,
          background: '#1f2937',
          padding: 6,
          borderRadius: 12,
        }}
      >
        {board.map((cell, index) => (
          <div
            key={index}
            onClick={() => handleClick(index)}
            style={{
              width: 90,
              height: 90,
              background: '#111827',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 700,
              color: cell === 'X' ? '#60a5fa' : '#f87171',
              cursor:
                cell || winner || (gameMode === 'ai' && currentPlayer === 'O')
                  ? 'default'
                  : 'pointer',
              transition: 'background 0.15s',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              if (!cell && !winner && !(gameMode === 'ai' && currentPlayer === 'O')) {
                e.currentTarget.style.background = '#1f2937';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#111827';
            }}
          >
            {cell}
          </div>
        ))}
      </div>

      {/* 按钮区 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={resetGame}
          style={{
            padding: '10px 24px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {t('tictactoe.newGame')}
        </button>
        <button
          onClick={resetAll}
          style={{
            padding: '10px 24px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {t('tictactoe.resetScores')}
        </button>
        <button
          onClick={onExit}
          style={{
            padding: '10px 24px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {t('tictactoe.exit')}
        </button>
      </div>
    </div>
  );
};

export default TicTacToeGame;