import React from 'react';
import type { Board, Pos } from './jungleTypes';
import { Animal, Side, ANIMAL_NAMES, ANIMAL_NAMES_EN } from './jungleTypes';

interface Props {
  board: Board;
  selectedPos: Pos | null;
  validMoves: Pos[];
  side: Side;
  locale: 'zh' | 'en';
  onCellClick: (pos: Pos) => void;
}

const ANIMAL_EMOJIS: Record<Animal, string> = {
  [Animal.RAT]: '🐭',
  [Animal.CAT]: '🐱',
  [Animal.DOG]: '🐶',
  [Animal.WOLF]: '🐺',
  [Animal.LEOPARD]: '🐆',
  [Animal.TIGER]: '🐯',
  [Animal.LION]: '🦁',
  [Animal.ELEPHANT]: '🐘',
};

const JungleBoard: React.FC<Props> = ({ board, selectedPos, validMoves, locale, onCellClick }) => {
  const isValidMove = (row: number, col: number) =>
    validMoves.some(m => m.row === row && m.col === col);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 56px)',
        gap: 1,
        background: '#3a7c4f',
        padding: 4,
        borderRadius: 8,
        border: '3px solid #2d5a3d',
        boxSizing: 'border-box',
      }}
    >
      {board.map((row, r) =>
        row.map((cell, c) => {
          const isSelected = selectedPos?.row === r && selectedPos?.col === c;
          const isValid = isValidMove(r, c);

          const isRiverCell = (r >= 3 && r <= 5) && (c === 1 || c === 2 || c === 4 || c === 5);
          const isRedTrap = (r === 0 && (c === 2 || c === 4)) || (r === 1 && c === 3);
          const isBlueTrap = (r === 8 && (c === 2 || c === 4)) || (r === 7 && c === 3);
          const isTrapCell = isRedTrap || isBlueTrap;
          const isRedDen = r === 0 && c === 3;
          const isBlueDen = r === 8 && c === 3;

          let bg = '#5a8f6c';
          if (isRiverCell) bg = '#38bdf8';
          if (isTrapCell) bg = '#92400e';
          if (isRedDen) bg = '#dc2626';
          if (isBlueDen) bg = '#2563eb';
          if (isValid) bg = '#facc15';

          const sideColor = cell?.side === Side.RED ? '#ef4444' : '#3b82f6';

          return (
            <div
              key={`${r}-${c}`}
              onClick={() => onCellClick({ row: r, col: c })}
              style={{
                width: 54,
                height: 54,
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                transition: 'all 0.1s',
                boxSizing: 'border-box',
                borderRadius: 2,
                position: 'relative',
              }}
            >
              {/* 陷阱标记 */}
              {isTrapCell && !cell && (
                <span
                  style={{
                    position: 'absolute',
                    fontSize: 18,
                    color: 'rgba(255,255,255,0.35)',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  ▼
                </span>
              )}

              {cell && (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: sideColor,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  <span style={{ fontSize: 22, lineHeight: 1, filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))' }}>
                    {ANIMAL_EMOJIS[cell.animal]}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: '#ffffff',
                      fontWeight: 700,
                      lineHeight: 1,
                      textShadow: '0px 0px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    {locale === 'zh' ? ANIMAL_NAMES[cell.animal] : ANIMAL_NAMES_EN[cell.animal]}
                  </span>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default JungleBoard;