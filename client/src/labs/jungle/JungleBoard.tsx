// client/src/labs/jungle/JungleBoard.tsx

import React, { useEffect, useRef, useMemo, useState } from 'react';
import type { MoveRecord } from './jungleApi';

const PIECE_CHARS: Record<string, string> = {
  L: '🦁', E: '🐘', T: '🐯', W: '🐺', M: '🐱', D: '🐶', R: '🐭',
};

const INITIAL_BOARD: (string | null)[][] = [
  ['L', 'E', 'T', 'W', 'M', 'D', 'R'],
  [null, null, null, null, null, null, null],
  [null, 'R', null, 'T', null, 'E', null],
  [null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null],
  [null, 'E', null, 'T', null, 'R', null],
  [null, null, null, null, null, null, null],
  ['R', 'D', 'M', 'W', 'T', 'E', 'L'],
];

interface BoardCell {
  piece: string;
  side: number;
}

type BoardState = (BoardCell | null)[][];

function initBoardState(): BoardState {
  return INITIAL_BOARD.map((row, r) =>
    row.map(cell =>
      cell
        ? {
            piece: cell,
            side: r <= 2 ? 0 : 1,
          }
        : null
    )
  );
}

function isRiver(r: number, c: number): boolean {
  return r >= 3 && r <= 5 && (c === 1 || c === 2 || c === 4 || c === 5);
}

function isTrap(r: number, c: number): boolean {
  return (
    (r === 0 && (c === 2 || c === 4)) ||
    (r === 1 && c === 3) ||
    (r === 8 && (c === 2 || c === 4)) ||
    (r === 7 && c === 3)
  );
}

function isDen(r: number, c: number): boolean {
  return (r === 0 && c === 3) || (r === 8 && c === 3);
}

function normalizeMove(boardBefore: BoardState, m: MoveRecord): MoveRecord {
  const fromHas = !!boardBefore[m.from_row]?.[m.from_col];
  if (!fromHas) {
    return {
      ...m,
      from_row: m.to_row,
      from_col: m.to_col,
      to_row: m.from_row,
      to_col: m.from_col,
    };
  }
  return m;
}

interface Props {
  moves?: MoveRecord[];
  currentStep?: number;
  pendingStep?: number | null;
}

const flashKeyframes = `
@keyframes jungle-from-flash {
  0%, 100% { background: #ffeb3b; box-shadow: inset 0 0 0 2px #fbc02d; }
  50%     { background: #fff59d; box-shadow: inset 0 0 0 2px #f9a825; }
}
.jungle-from {
  animation: jungle-from-flash 0.66s ease-in-out infinite;
}
.jungle-to {
  background: #fff176 !important;
  box-shadow: inset 0 0 0 2px #fbc02d;
}

.jungle-trap-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    45deg,
    rgba(60, 20, 90, 0.18) 0 5px,
    transparent 5px 10px
  );
}

.jungle-trap-border {
  position: absolute;
  inset: 3px;
  border: 2px dashed rgba(60, 20, 90, 0.58);
  border-radius: 4px;
  pointer-events: none;
}

.jungle-trap-mark {
  position: absolute;
  right: 3px;
  bottom: -3px;
  color: rgba(45, 15, 75, 0.82);
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  pointer-events: none;
}
`;

const TRAP_BG = 'linear-gradient(135deg, #dccdff 0%, #8e6cd9 100%)';

const JungleBoard: React.FC<Props> = ({ moves = [], currentStep = 0, pendingStep = null }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(42);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const size = Math.max(28, Math.min(52, Math.floor((w - 8) / 7)));
        setCellSize(size);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const effectiveHighlightStep = pendingStep ?? currentStep;

  const { board, normalizedLastMove } = useMemo(() => {
    const b = initBoardState();

    for (let i = 0; i < currentStep && i < moves.length; i++) {
      const m = moves[i];
      const nm = normalizeMove(b, m);
      b[nm.to_row][nm.to_col] = b[nm.from_row][nm.from_col];
      b[nm.from_row][nm.from_col] = null;
    }

    let nlm: MoveRecord | undefined;
    if (effectiveHighlightStep > 0 && effectiveHighlightStep <= moves.length) {
      const m = moves[effectiveHighlightStep - 1];
      const boardBefore = b.map(row => [...row]);
      nlm = normalizeMove(boardBefore, m);
    }

    return { board: b, normalizedLastMove: nlm };
  }, [currentStep, moves, effectiveHighlightStep]);

  const highlightFrom = useMemo(() => {
    const s = new Set<string>();
    if (normalizedLastMove) s.add(`${normalizedLastMove.from_row},${normalizedLastMove.from_col}`);
    return s;
  }, [normalizedLastMove]);

  const highlightTo = useMemo(() => {
    const s = new Set<string>();
    if (normalizedLastMove) s.add(`${normalizedLastMove.to_row},${normalizedLastMove.to_col}`);
    return s;
  }, [normalizedLastMove]);

  const gridWidth = cellSize * 7;
  const gridHeight = cellSize * 9;
  const labelSize = 16;
  const leftLabelWidth = 16;

  return (
    <>
      <style>{flashKeyframes}</style>
      <div ref={containerRef} style={{ width: '100%', maxWidth: 420 }}>
        <div
          style={{
            position: 'relative',
            width: 'fit-content',
            margin: '0 auto',
            paddingTop: labelSize,
            paddingLeft: leftLabelWidth,
          }}
        >
          {/* 顶部列号 0~6 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: leftLabelWidth,
              width: gridWidth,
              height: labelSize,
              display: 'grid',
              gridTemplateColumns: `repeat(7, ${cellSize}px)`,
              pointerEvents: 'none',
              color: '#777',
              fontFamily: 'monospace',
              fontSize: 10,
              lineHeight: `${labelSize}px`,
              textAlign: 'center',
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6].map(n => (
              <span key={`ct-${n}`}>{n}</span>
            ))}
          </div>

          {/* 左侧行号 0~8 */}
          <div
            style={{
              position: 'absolute',
              top: labelSize,
              left: 0,
              width: leftLabelWidth,
              height: gridHeight,
              display: 'grid',
              gridTemplateRows: `repeat(9, ${cellSize}px)`,
              pointerEvents: 'none',
              color: '#777',
              fontFamily: 'monospace',
              fontSize: 10,
              lineHeight: `${cellSize}px`,
              textAlign: 'center',
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <span key={`rl-${n}`}>{n}</span>
            ))}
          </div>

          {/* 棋盘网格 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(7, ${cellSize}px)`,
              gridTemplateRows: `repeat(9, ${cellSize}px)`,
              border: '2px solid #5D4037',
              borderRadius: 8,
              overflow: 'hidden',
              width: 'fit-content',
              boxSizing: 'content-box',
            }}
          >
            {board.flatMap((row, r) =>
              row.map((cell, c) => {
                const key = `${r},${c}`;
                const river = isRiver(r, c);
                const trap = isTrap(r, c);
                const den = isDen(r, c);

                let bg: string;
                if (river) {
                  bg = '#bbdefb';
                } else if (den) {
                  bg = '#ffccbc';
                } else if (trap) {
                  bg = TRAP_BG;
                } else {
                  bg = (r + c) % 2 === 0 ? '#f5deb3' : '#e8c88a';
                }

                let extraClass = '';
                if (highlightFrom.has(key)) {
                  bg = '#ffeb3b';
                  extraClass = 'jungle-from';
                } else if (highlightTo.has(key)) {
                  bg = '#fff176';
                  extraClass = 'jungle-to';
                }

                return (
                  <div
                    key={key}
                    className={extraClass}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      boxSizing: 'border-box',
                      border: '1px solid #8D6E63',
                      background: bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: cellSize * 0.36,
                      lineHeight: 1,
                      position: 'relative',
                      transition: 'background 0.04s',
                    }}
                  >
                    {trap && !cell && (
                      <>
                        <div className="jungle-trap-overlay" />
                        <div className="jungle-trap-border" />
                        <div className="jungle-trap-mark">×</div>
                      </>
                    )}

                    {cell ? (
                      <span
                        style={{
                          fontSize: cellSize * 0.53,
                          zIndex: 1,
                          lineHeight: 1,
                          padding: 2,
                          borderRadius: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background:
                            cell.side === 0
                              ? 'rgba(28,96,186,0.20)'
                              : 'rgba(192,40,40,0.19)',
                          boxShadow:
                            cell.side === 0
                              ? '0 0 0 2px rgba(27,99,189,0.69), 0 0 7px rgba(23,89,171,0.72)'
                              : '0 0 0 2px rgba(201,44,44,0.64), 0 0 7px rgba(181,34,34,0.66)',
                          filter:
                            cell.side === 0
                              ? 'drop-shadow(0 0 1px #10509e)'
                              : 'drop-shadow(0 0 1px #a51818)',
                        }}
                      >
                        {PIECE_CHARS[cell.piece] ?? cell.piece}
                      </span>
                    ) : river ? (
                      <span style={{ opacity: 0.35, fontSize: cellSize * 0.21, zIndex: 1 }}>〰</span>
                    ) : den ? (
                      <span style={{ opacity: 0.28, fontSize: cellSize * 0.18, zIndex: 1 }}>🏠</span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default JungleBoard;