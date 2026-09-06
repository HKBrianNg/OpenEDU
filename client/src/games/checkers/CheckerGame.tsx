// src/games/checker/CheckerGame.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initBoard, isValidPos, getValidMoves, checkWin } from './Rules';
import type { Player, Position, BoardState } from './Rules';

const CheckerGame: React.FC = () => {
  const navigate = useNavigate();

  // 游戏状态
  const [board, setBoard] = useState<BoardState>(initBoard());
  const [turn, setTurn] = useState<Player>('blue'); // 默认蓝方先手
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);

  // 处理格子点击
  const handleCellClick = (r: number, c: number) => {
    if (winner) return;

    const clickedPiece = board[r][c];
    const isCurrentPlayerPiece = clickedPiece === turn;

    // 1. 如果点击的是自己的棋子 -> 选中它
    if (isCurrentPlayerPiece) {
      setSelectedPos({ r, c });
      setValidMoves(getValidMoves(board, { r, c }));
      return;
    }

    // 2. 如果已经选中了棋子，且点击的是合法移动位置 -> 移动
    if (selectedPos) {
      const isMoveValid = validMoves.some(m => m.r === r && m.c === c);
      if (isMoveValid) {
        executeMove(selectedPos, { r, c });
      } else {
        // 点击了空地或非法位置，取消选中
        setSelectedPos(null);
        setValidMoves([]);
      }
    }
  };

  // 执行移动逻辑
  const executeMove = (from: Position, to: Position) => {
    const newBoard = board.map(row => [...row]);
    newBoard[to.r][to.c] = newBoard[from.r][from.c];
    newBoard[from.r][from.c] = null;

    setBoard(newBoard);
    setSelectedPos(null);
    setValidMoves([]);

    // 检查胜负
    const winResult = checkWin(newBoard);
    if (winResult) {
      setWinner(winResult);
    } else {
      // 切换回合
      setTurn(turn === 'blue' ? 'red' : 'blue');
    }
  };

  // 重新开始
  const handleRestart = () => {
    setBoard(initBoard());
    setTurn('blue');
    setWinner(null);
    setSelectedPos(null);
    setValidMoves([]);
  };

  // 获取格子样式 (内联样式确保显示)
  const getCellStyle = (r: number, c: number) => {
    const isSelected = selectedPos?.r === r && selectedPos?.c === c;
    const isValid = validMoves.some(m => m.r === r && m.c === c);
    
    let bg = '#e0e0e0'; // 默认灰色空地
    if (isValid) bg = '#a5d6a7'; // 合法移动点：绿色
    if (isSelected) bg = '#fff59d'; // 选中状态：黄色

    return {
      width: '40px',
      height: '40px',
      backgroundColor: bg,
      border: '1px solid #ccc',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: isValid ? 'pointer' : 'default',
      margin: '2px'
    };
  };

  // 获取棋子样式
  const getPieceStyle = (piece: Player | null) => {
    if (!piece) return {};
    return {
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      backgroundColor: piece === 'blue' ? '#1976d2' : '#d32f2f', // 蓝方深蓝，红方深红
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
    };
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h2>迷你波子棋 (10子版)</h2>
      
      {/* 状态栏 */}
      <div style={{ marginBottom: '20px', fontSize: '1.2em' }}>
        {winner ? (
          <span style={{ color: winner === 'blue' ? 'blue' : 'red', fontWeight: 'bold' }}>
            🏆 获胜者: {winner === 'blue' ? '蓝方' : '红方'}!
          </span>
        ) : (
          <span>当前回合: <span style={{ color: turn === 'blue' ? 'blue' : 'red' }}>{turn === 'blue' ? '蓝方' : '红方'}</span></span>
        )}
      </div>

      {/* 棋盘区域 - 使用简单的 Flex/Grid 布局 */}
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
              // 如果是无效坐标（六角星外的区域），渲染透明占位符
              if (!isValidPos(r, c)) {
                return <div key={`${r}-${c}`} style={{ width: '44px', height: '44px' }} />;
              }

              return (
                <div 
                  key={`${r}-${c}`} 
                  style={getCellStyle(r, c)}
                  onClick={() => handleCellClick(r, c)}
                >
                  {cell && <div style={getPieceStyle(cell)} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 底部按钮 */}
      <div style={{ marginTop: '30px' }}>
        <button onClick={() => navigate('/')} style={{ marginRight: '10px', padding: '8px 16px' }}>
          返回大厅
        </button>
        <button onClick={handleRestart} style={{ padding: '8px 16px' }}>
          重新开始
        </button>
      </div>
    </div>
  );
};

export default CheckerGame;