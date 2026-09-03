// client/src/games/jungle/jungleBoard.tsx
import React, { useEffect, useRef, useState } from 'react';
import type { Board, Pos } from './jungleTypes';
import { Animal, Side } from './jungleTypes';
// 从 jungleRules 导入，统一坐标源
import { isAnyTrap } from './jungleRules';

// 数字 Animal -> emoji 映射（与 jungleTypes.ts 的 1~8 完全对齐）
const PIECE_CHARS: Record<Animal, string> = {
  [Animal.RAT]: '🐭',
  [Animal.CAT]: '🐱',
  [Animal.DOG]: '🐶',
  [Animal.WOLF]: '🐺',
  [Animal.LEOPARD]: '🐆',
  [Animal.TIGER]: '🐯',
  [Animal.LION]: '🦁',
  [Animal.ELEPHANT]: '🐘',
};

// 河：行 3~5，列 1、2、4、5
function isRiver(r: number, c: number): boolean {
  return r >= 3 && r <= 5 && (c === 1 || c === 2 || c === 4 || c === 5);
}

// 兽穴 Den
// row0,col3：蓝方AI兽穴（敌方老家，玩家进攻目标）
// row8,col3：红方玩家兽穴（我方老家）
function isDen(r: number, c: number): boolean {
  return (r === 0 && c === 3) || (r === 8 && c === 3);
}

// 判断兽穴归属：red=玩家，blue=AI
function denSide(r: number, c: number): 'red' | 'blue' | null {
  if (r === 8 && c === 3) return 'red';
  if (r === 0 && c === 3) return 'blue';
  return null;
}

interface Props {
  board: Board;
  selectedPos: Pos | null;
  validMoves: Pos[];
  side: Side;
  locale: 'zh' | 'en';
  onCellClick: (pos: Pos) => void;
}

const JungleBoard: React.FC<Props> = ({
  board,
  selectedPos,
  validMoves,
  onCellClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(52);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const size = Math.max(28, Math.min(56, Math.floor((w - 8) / 7)));
        setCellSize(size);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const selectedKey = selectedPos ? `${selectedPos.row},${selectedPos.col}` : null;
  const validMoveKeys = new Set(validMoves.map(p => `${p.row},${p.col}`));

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 450 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(7, ${cellSize}px)`,
          gridTemplateRows: `repeat(9, ${cellSize}px)`,
          border: '2px solid #5D4037',
          borderRadius: 8,
          overflow: 'hidden',
          width: 'fit-content',
          margin: '0 auto',
        }}
      >
        {board.flatMap((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const river = isRiver(r, c);
            const trap = isAnyTrap(r, c);
            const den = isDen(r, c);
            const denOwner = denSide(r, c);
            let bg: string;
            if (den) {
              bg = denOwner === 'blue' ? '#c7d2fe' : '#fecaca';
            } else if (river) {
              bg = '#bbdefb';
            } else if (trap) {
              bg = '#ffe0b2';
            } else {
              bg = (r + c) % 2 === 0 ? '#f5deb3' : '#e8c88a';
            }
            if (selectedKey === key) bg = '#81d4fa';
            if (validMoveKeys.has(key)) bg = '#a5d6a7';

            const animalChar = cell ? PIECE_CHARS[cell.animal] : null;

            return (
              <div
                key={key}
                onClick={() => onCellClick({ row: r, col: c })}
                style={{
                  width: cellSize,
                  height: cellSize,
                  boxSizing: 'border-box',
                  border: '1px solid #8D6E63',
                  background: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: cellSize * 0.45,
                  lineHeight: 1,
                  position: 'relative',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                }}
              >
                {animalChar ? (
                  <span
                    style={{
                      width: cellSize * 0.65,
                      height: cellSize * 0.65,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: cellSize * 0.38,
                      zIndex: 2,
                      background:
                        cell?.side === Side.RED
                          ? 'radial-gradient(circle, #ef4444 0%, #b91c1c 100%)'
                          : 'radial-gradient(circle, #3b82f6 0%, #1e40af 100%)',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                    }}
                  >
                    {animalChar}
                  </span>
                ) : den ? (
                  <div
                    style={{
                      width: cellSize * 0.72,
                      height: cellSize * 0.72,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: cellSize * 0.42,
                      background:
                        denOwner === 'blue'
                          ? 'radial-gradient(circle, #60a5fa 0%, #1d4ed8 100%)'
                          : 'radial-gradient(circle, #f87171 0%, #b91c1c 100%)',
                      border: '3px solid #ffffff',
                      boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25)',
                    }}
                  >
                    🕳️
                  </div>
                ) : river ? (
                  <span style={{ opacity: 0.45, fontSize: cellSize * 0.33 }}>〰</span>
                ) : trap ? (
                  <span style={{ opacity: 0.35, fontSize: cellSize * 0.27 }}>✕</span>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default JungleBoard;
