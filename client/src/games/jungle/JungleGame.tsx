// JungleGame.tsx
import { useRef, useEffect, useState } from 'react';
import { useLocale } from '../../store/LocaleContext';
import type { DragState, JunglePiece, Side } from './types';
import { createBoardCellType, initPieces, getPieceAt, ANIMAL_NAMES } from './board';
import { getValidMoves } from './rules';
import { searchBestMove } from './ai';

export default function JungleGame({ isMobile = false, onExit }: { isMobile?: boolean; onExit?: () => void }) {
  const { t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CELL_SIZE = isMobile ? 34 : 44;
  const BOARD_WIDTH = 7 * CELL_SIZE;
  const BOARD_HEIGHT = 9 * CELL_SIZE;

  const cellType = useRef(createBoardCellType());
  const piecesRef = useRef<JunglePiece[]>(initPieces());
  const turnRef = useRef<Side>('red');
  const gameOverRef = useRef(false);
  const [statusText, setStatusText] = useState(t('jungle.status.redTurn'));

  const dragRef = useRef<DragState>({ active: false, piece: null, hoverX: null, hoverY: null });
  const selectedPieceRef = useRef<JunglePiece | null>(null);
  const flashFrameRef = useRef(0);
  const animRef = useRef<number>(0);

  function aiMakeMove() {
    if (gameOverRef.current) return;
    const best = searchBestMove(piecesRef.current, cellType.current, 2);
    if (!best) {
      setStatusText(t('jungle.status.aiNoMove'));
      gameOverRef.current = true;
      return;
    }
    const targetIdx = piecesRef.current.findIndex(p => p.x === best.toX && p.y === best.toY);
    if (targetIdx !== -1) {
      piecesRef.current.splice(targetIdx, 1);
    }
    best.piece.x = best.toX;
    best.piece.y = best.toY;
    best.piece.inRiver = cellType.current[best.toY][best.toX] === 'river';

    if (cellType.current[best.toY][best.toX] === 'den') {
      gameOverRef.current = true;
      setStatusText(t('jungle.status.aiWin'));
      return;
    }
    turnRef.current = 'red';
    setStatusText(t('jungle.status.redTurn'));
  }

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    // 绘制棋盘格子，y做镜像：visualY = 8 - y
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 7; x++) {
        const ct = cellType.current[y][x];
        const visualY = 8 - y;
        ctx.fillStyle = '#f3e2bc';
        if (ct === 'river') ctx.fillStyle = '#63a8e8';
        if (ct === 'trap') ctx.fillStyle = '#ffd8a8';
        if (ct === 'den') ctx.fillStyle = '#ffaaaa';
        ctx.fillRect(x * CELL_SIZE, visualY * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    }

    // 绘制可行点
    if (selectedPieceRef.current) {
      const valid = getValidMoves(piecesRef.current, selectedPieceRef.current, cellType.current);
      for (const [mx, my] of valid) {
        const targetPc = getPieceAt(piecesRef.current, mx, my);
        const visualMy = 8 - my;
        ctx.beginPath();
        ctx.arc(mx * CELL_SIZE + CELL_SIZE / 2, visualMy * CELL_SIZE + CELL_SIZE / 2, 10, 0, Math.PI * 2);
        ctx.fillStyle = targetPc ? 'rgba(255,30,30,0.55)' : 'rgba(20,180,40,0.55)';
        ctx.fill();
      }
    }

    const drag = dragRef.current;
    if (drag.active && drag.piece && drag.hoverX !== null && drag.hoverY !== null) {
      const mvList = getValidMoves(piecesRef.current, drag.piece, cellType.current);
      const isValid = mvList.some(([mx, my]) => mx === drag.hoverX && my === drag.hoverY);
      if (isValid) {
        const targetPc = getPieceAt(piecesRef.current, drag.hoverX, drag.hoverY);
        flashFrameRef.current += 1;
        const visualHoverY = 8 - drag.hoverY;
        if (targetPc && targetPc.side !== drag.piece.side) {
          if (Math.sin(flashFrameRef.current * 0.2) > 0) {
            ctx.fillStyle = 'rgba(240,40,40,0.45)';
            ctx.fillRect(drag.hoverX * CELL_SIZE, visualHoverY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        } else {
          ctx.fillStyle = 'rgba(40,180,60,0.35)';
          ctx.fillRect(drag.hoverX * CELL_SIZE, visualHoverY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    for (const pc of piecesRef.current) {
      ctx.save();
      const visualY = 8 - pc.y;
      const cx = pc.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = visualY * CELL_SIZE + CELL_SIZE / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL_SIZE * 0.38, 0, Math.PI * 2);
      if (selectedPieceRef.current === pc) {
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.fillStyle = pc.side === 'red' ? '#ff4444' : '#3366ff';
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${CELL_SIZE * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ANIMAL_NAMES[pc.animal], cx, cy);
      ctx.restore();
    }
  };

  const loop = () => {
    draw();
    animRef.current = requestAnimationFrame(loop);
  };

  const getGridPos = (e: MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = BOARD_WIDTH / rect.width;
    const sy = BOARD_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sy;
    const gx = Math.floor(mx / CELL_SIZE);
    const gyVisual = Math.floor(my / CELL_SIZE);
    const gy = 8 - gyVisual;
    if (gx < 0 || gx >= 7 || gy < 0 || gy >= 9) return null;
    return { x: gx, y: gy };
  };

  const onMouseDown = (e: MouseEvent) => {
    if (gameOverRef.current) return;
    if (turnRef.current !== 'red') return;
    const pos = getGridPos(e);
    if (!pos) return;
    const pc = getPieceAt(piecesRef.current, pos.x, pos.y);

    if (pc && pc.side === 'red') {
      selectedPieceRef.current = pc;
      dragRef.current = { active: true, piece: pc, hoverX: pos.x, hoverY: pos.y };
      return;
    }

    if (selectedPieceRef.current) {
      const sel = selectedPieceRef.current;
      const validMoves = getValidMoves(piecesRef.current, sel, cellType.current);
      const ok = validMoves.some(([mx, my]) => mx === pos.x && my === pos.y);
      if (ok) {
        const target = getPieceAt(piecesRef.current, pos.x, pos.y);
        if (target) {
          piecesRef.current = piecesRef.current.filter(p => p !== target);
        }
        sel.x = pos.x;
        sel.y = pos.y;
        sel.inRiver = cellType.current[pos.y][pos.x] === 'river';
        selectedPieceRef.current = null;

        if (cellType.current[pos.y][pos.x] === 'den') {
          gameOverRef.current = true;
          setStatusText(t('jungle.status.redWin'));
          return;
        }
        turnRef.current = 'blue';
        setStatusText(t('jungle.status.aiThinking'));
        setTimeout(() => aiMakeMove(), 450);
      } else {
        selectedPieceRef.current = null;
      }
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragRef.current.active) return;
    const pos = getGridPos(e);
    if (pos) {
      dragRef.current.hoverX = pos.x;
      dragRef.current.hoverY = pos.y;
    } else {
      dragRef.current.hoverX = null;
      dragRef.current.hoverY = null;
    }
  };

  const onMouseUp = () => {
    const drag = dragRef.current;
    if (!drag.active || !drag.piece) {
      dragRef.current = { active: false, piece: null, hoverX: null, hoverY: null };
      return;
    }
    const piece = drag.piece;
    const hx = drag.hoverX;
    const hy = drag.hoverY;
    if (hx !== null && hy !== null) {
      const validMoves = getValidMoves(piecesRef.current, piece, cellType.current);
      const ok = validMoves.some(([mx, my]) => mx === hx && my === hy);
      if (ok) {
        const target = getPieceAt(piecesRef.current, hx, hy);
        if (target) {
          piecesRef.current = piecesRef.current.filter(p => p !== target);
        }
        piece.x = hx;
        piece.y = hy;
        piece.inRiver = cellType.current[hy][hx] === 'river';
        selectedPieceRef.current = null;
        if (cellType.current[hy][hx] === 'den') {
          gameOverRef.current = true;
          setStatusText(t('jungle.status.redWin'));
          dragRef.current = { active: false, piece: null, hoverX: null, hoverY: null };
          return;
        }
        turnRef.current = 'blue';
        setStatusText(t('jungle.status.aiThinking'));
        setTimeout(() => aiMakeMove(), 450);
      }
    }
    dragRef.current = { active: false, piece: null, hoverX: null, hoverY: null };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    animRef.current = requestAnimationFrame(loop);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const resetGame = () => {
    piecesRef.current = initPieces();
    turnRef.current = 'red';
    gameOverRef.current = false;
    dragRef.current = { active: false, piece: null, hoverX: null, hoverY: null };
    selectedPieceRef.current = null;
    setStatusText(t('jungle.status.redTurn'));
  };

  const btnStyle: React.CSSProperties = {
    padding: isMobile ? '6px 12px' : '8px 18px',
    fontSize: isMobile ? 13 : 15,
    border: 'none',
    borderRadius: 6,
    background: '#8b4513',
    color: '#fff',
    cursor: 'pointer',
    marginTop: 10
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? 8 : 16, background: '#f5e6c8', fontFamily: '"Microsoft YaHei",sans-serif' }}>
      <h3 style={{ color: '#8b4513', margin: '6px 0', fontSize: isMobile ? 18 : 22 }}>
        {t('jungle.title')}
      </h3>
      <div style={{ fontSize: isMobile ? 14 : 17, margin: '4px 0 8px', color: '#5a3a1a', minHeight: 22 }}>{statusText}</div>
      <canvas
        ref={canvasRef}
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        style={{ border: '2px solid #333', borderRadius: 4, maxWidth: '100%', height: 'auto', touchAction: 'none' }}
      />
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button onClick={resetGame} style={btnStyle}>{t('jungle.btn.reset')}</button>
        {onExit && <button onClick={onExit} style={{ ...btnStyle, background: '#666' }}>{t('jungle.btn.exitLobby')}</button>}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#666', textAlign: 'center' }}>
        {t('jungle.hint')}
      </div>
    </div>
  );
}