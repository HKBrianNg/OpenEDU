// src/games/checker/CheckerGame.tsx

import React, { useState, useEffect } from 'react';
import { initBoard, isValidPos, getValidMoves, checkWin } from './Rules'; 
import { calculateAiMove } from './ai'; 
import type { Player, Position, BoardState } from './Rules';
import { useLocale } from '../../store/LocaleContext';

// 【修改1】定义组件的 Props 类型，包含 onExit 回调函数
interface CheckerGameProps {
  onExit: () => void;
}

// 【修改2】将 Props 类型应用到组件上
const CheckerGame: React.FC<CheckerGameProps> = ({ onExit }) => {
  const { t } = useLocale();

  // 历史记录栈，用于悔棋。初始状态为游戏开局
  const [history, setHistory] = useState<BoardState[]>([initBoard()]);
  
  // 游戏核心状态
  const [board, setBoard] = useState<BoardState>(initBoard());
  const [turn, setTurn] = useState<Player>('red'); // 红方先手
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // 1. 执行移动的核心函数
  const handleMove = (from: Position, to: Position) => {
    const newBoard = board.map(row => [...row]);
    newBoard[to.r][to.c] = newBoard[from.r][from.c];
    newBoard[from.r][from.c] = null;

    // 每次合法移动后，将新棋盘压入历史记录
    setHistory(prev => [...prev, newBoard]);

    // 检查是否获胜
    const winResult = checkWin(newBoard);
    if (winResult) {
      setWinner(winResult);
    }

    setBoard(newBoard);
    setTurn(turn === 'red' ? 'blue' : 'red');
    setSelectedPos(null);
    setValidMoves([]);
  };

  // 悔棋逻辑
  const handleUndo = () => {
    // 如果历史记录只有初始状态，或者 AI 正在思考，则无法悔棋
    if (history.length <= 1 || isAiThinking) return;

    // 无论当前是谁的回合，悔棋都是回退到玩家操作前的状态。
    // 如果当前是 AI 刚走完（turn=red），我们需要回退 2 步（撤销AI + 撤销玩家）
    // 如果当前是玩家刚走完（turn=blue），我们需要回退 1 步（撤销玩家）
    // 为了简单且绝对安全，我们直接回退到历史栈的倒数第二步（即玩家上一次操作前）
    // 如果不足两步，则回退到第一步（初始状态）
    const targetIndex = Math.max(0, history.length - 2);
    const previousBoard = history[targetIndex];

    // 截断历史记录栈，丢弃被撤销的步骤
    setHistory(history.slice(0, targetIndex + 1));
    setBoard(previousBoard);
    setTurn('red'); // 悔棋后永远是玩家（红方）的回合
    setWinner(null); // 清除胜负状态
    setSelectedPos(null);
    setValidMoves([]);
  };

  // 2. 监听回合变化，如果是蓝方回合，触发 AI
  useEffect(() => {
    if (turn === 'blue' && !winner) {
      setIsAiThinking(true);
      
      const timer = setTimeout(() => {
        const move = calculateAiMove(board);
        if (move) {
          handleMove(move.from, move.to);
        }
        setIsAiThinking(false);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [turn, winner, board]);

  // 3. 玩家点击格子逻辑
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

  // 4. 重新开始游戏
  const handleRestart = () => {
    const newBoard = initBoard();
    setHistory([newBoard]); // 重置时也要清空历史
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
      
      {/* 状态栏 */}
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

      {/* 棋盘区域 */}
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

      {/* 底部按钮组 */}
      <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
        {/* 1. 重新开始 */}
        <button onClick={handleRestart} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          🔄 {t('checker.button.restart')}
        </button>
        {/* 2. 悔棋 */}
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
        {/* 3. AI 开关 (占位，当前为固定人机对战) */}
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
        {/* 4. 返回大厅 */}
        {onExit && (
          <button
            onClick={onExit}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              background: '#666',
              color: '#fff',
              border: 'none',
              borderRadius: 4
            }}
          >
            {t('checker.button.exit') || '返回大厅'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CheckerGame;