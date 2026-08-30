import React, { useEffect, useRef, useState } from 'react';
import type { MoveRecord } from './jungleApi';

const PIECE_CHARS: Record<string, string> = {
  L: '🦁', E: '🐘', T: '🐯', W: '🐺', M: '🐱', D: '🐶', R: '🐭',
};

const INITIAL_BOARD: (string | null)[][] = [
  ['R', 'D', 'M', 'W', 'T', 'E', 'L'],
  [null, null, null, null, null, null, null],
  [null, 'R', null, 'T', null, 'E', null],
  [null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null],
  [null, 'E', null, 'T', null, 'R', null],
  [null, null, null, null, null, null, null],
  ['L', 'E', 'T', 'W', 'M', 'D', 'R'],
];

// 河：行 3~5，列 1、2、4、5
function isRiver(r: number, c: number): boolean {
  return r >= 3 && r <= 5 && (c === 1 || c === 2 || c === 4 || c === 5);
}

// 陷阱：红方 (0,2)(0,4)(1,3)；蓝方 (8,2)(8,4)(7,3)
function isTrap(r: number, c: number): boolean {
  return (
    (r === 0 && (c === 2 || c === 4)) ||
    (r === 1 && c === 3) ||
    (r === 8 && (c === 2 || c === 4)) ||
    (r === 7 && c === 3)
  );
}

// 兽穴：红 (0,3)、蓝 (8,3)
function isDen(r: number, c: number): boolean {
  return (r === 0 && c === 3) || (r === 8 && c === 3);
}

interface Props {
  moves?: MoveRecord[];
  currentStep?: number;
}

const JungleBoard: React.FC<Props> = ({ moves = [], currentStep = 0 }) => {
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

  const highlightFrom = new Set<string>();
  const highlightTo = new Set<string>();

  if (currentStep > 0 && moves[currentStep - 1]) {
    const m = moves[currentStep - 1];
    highlightFrom.add(`${m.from_row},${m.from_col}`);
    highlightTo.add(`${m.to_row},${m.to_col}`);
  }

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
        {INITIAL_BOARD.flatMap((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const river = isRiver(r, c);
            const trap = isTrap(r, c);
            const den = isDen(r, c);

            let bg: string;
            if (river) {
              bg = '#bbdefb'; // 浅蓝水色
            } else if (den) {
              bg = '#ffccbc'; // 兽穴橙色
            } else if (trap) {
              bg = '#ffe0b2'; // 陷阱浅橙
            } else {
              bg = (r + c) % 2 === 0 ? '#f5deb3' : '#e8c88a';
            }

            // 高亮覆盖
            if (highlightFrom.has(key)) bg = '#4fc3f7';
            if (highlightTo.has(key)) bg = '#ff7043';

            // 水纹波浪符号
            let waterMark = '';
            if (river) {
              waterMark = '〰';
            }

            return (
              <div
                key={key}
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
                  color: river ? '#90caf9' : 'inherit',
                }}
              >
                {cell ? (
                  <span style={{ fontSize: cellSize * 0.58, zIndex: 1 }}>
                    {PIECE_CHARS[cell] ?? cell}
                  </span>
                ) : river ? (
                  <span style={{ opacity: 0.35, fontSize: cellSize * 0.33 }}>〰</span>
                ) : trap ? (
                  <span style={{ opacity: 0.25, fontSize: cellSize * 0.27 }}>✕</span>
                ) : den ? (
                  <span style={{ opacity: 0.3, fontSize: cellSize * 0.22 }}>🏠</span>
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