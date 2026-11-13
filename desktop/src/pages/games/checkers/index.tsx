import { useState, useEffect } from 'react';
import { initBoard, isValidPos, getValidMoves, checkWin } from './Rules';
import { calculateAiMove } from './ai';
import type { Player, Position, BoardState } from './Rules';
import { useLocale } from '../../../store/LocaleContext';

export function CheckerGame() {
  const { t } = useLocale();

  const [history, setHistory] = useState<BoardState[]>([initBoard()]);
  const [board, setBoard] = useState<BoardState>(initBoard());
  const [turn, setTurn] = useState<Player>('red');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const handleMove = (from: Position, to: Position) => {
    const newBoard = board.map(row => [...row]);
    newBoard[to.r][to.c] = newBoard[from.r][from.c];
    newBoard[from.r][from.c] = null;
    setHistory(prev => [...prev, newBoard]);
    const winResult = checkWin(newBoard);
    if (winResult) setWinner(winResult);
    setBoard(newBoard);
    setTurn(turn === 'red' ? 'blue' : 'red');
    setSelectedPos(null);
    setValidMoves([]);
  };

  const handleUndo = () => {
    if (history.length <= 1 || isAiThinking) return;
    const targetIndex = Math.max(0, history.length - 2);
    const previousBoard = history[targetIndex];
    setHistory(history.slice(0, targetIndex + 1));
    setBoard(previousBoard);
    setTurn('red');
    setWinner(null);
    setSelectedPos(null);
    setValidMoves([]);
  };

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (turn === 'blue' && !winner) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const move = calculateAiMove(board);
        if (move) handleMove(move.from, move.to);
        setIsAiThinking(false);
      }, 800);
      return () => clearTimeout(timer);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, winner, board]);

  const handleCellClick = (r: number, c: number) => {
    if (winner || isAiThinking || turn !== 'red') return;
    const piece = board[r][c];
    if (selectedPos?.r === r && selectedPos?.c === c) {
      setSelectedPos(null);
      setValidMoves([]);
      return;
    }
    if (piece === 'red') {
      setSelectedPos({ r, c });
      setValidMoves(getValidMoves(board, { r, c }));
      return;
    }
    const isValidTarget = validMoves.some(m => m.r === r && m.c === c);
    if (selectedPos && isValidTarget) {
      handleMove(selectedPos, { r, c });
    }
  };

  const handleRestart = () => {
    const newBoard = initBoard();
    setHistory([newBoard]);
    setBoard(newBoard);
    setTurn('red');
    setWinner(null);
    setSelectedPos(null);
    setValidMoves([]);
    setIsAiThinking(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>{t('checker.title')}</h2>

      <div style={{ marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>
        {winner ? (
          <span style={{ color: winner === 'red' ? '#dc3545' : '#007bff' }}>
            🏆 {winner === 'red' ? t('checker.win.red') : t('checker.win.blue')}
          </span>
        ) : (
          <span style={{ color: turn === 'red' ? '#dc3545' : '#007bff' }}>
            {isAiThinking
              ? `🤖 ${t('checker.status.thinking')}`
              : `${t('checker.turn.' + turn)}`
            }
          </span>
        )}
      </div>

      <div style={{
        display: 'inline-block',
        border: '5px solid #8d6e63',
        padding: '10px',
        backgroundColor: '#fff3e0',
        borderRadius: '8px'
      }}>
        {board.map((row, r) => (
          <div key={r} style={{ display: 'flex', justifyContent: 'center' }}>
            {row.map((cell, c) => {
              if (!isValidPos(r, c)) {
                return <div key={`${r}-${c}`} style={{ width: '44px', height: '44px' }} />;
              }
              const isSelected = selectedPos?.r === r && selectedPos?.c === c;
              const isValidTarget = validMoves.some(m => m.r === r && m.c === c);
              let bg = '#e0e0e0';
              if (isValidTarget) bg = '#a5d6a7';
              if (isSelected) bg = '#fff59d';
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    width: '40px', height: '40px', margin: '2px',
                    backgroundColor: bg, border: '1px solid #ccc',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    cursor: isValidTarget ? 'pointer' : 'default',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleCellClick(r, c)}
                >
                  {cell && (
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      backgroundColor: cell === 'blue' ? '#1976d2' : '#d32f2f',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      opacity: isAiThinking && cell === 'blue' ? 0.6 : 1
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
        <button onClick={handleRestart} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          🔄 {t('checker.button.restart')}
        </button>
        <button
          onClick={handleUndo}
          disabled={history.length <= 1 || isAiThinking}
          style={{
            padding: '8px 16px',
            cursor: history.length <= 1 || isAiThinking ? 'not-allowed' : 'pointer',
            backgroundColor: history.length <= 1 ? '#eee' : '#fff',
            border: '1px solid #ccc'
          }}
        >
          ↩️ {t('checker.button.undo')}
        </button>
        <button
          disabled
          style={{
            padding: '8px 16px',
            cursor: 'not-allowed',
            backgroundColor: '#eee',
            border: '1px solid #ccc',
            color: '#999'
          }}
        >
          🤖 AI
        </button>
      </div>
    </div>
  );
};