// components/games/xiangqi/XiangqiGame.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useLocale } from '../../store/LocaleContext';
import type { GameState, XiangqiGameProps, Move } from './types';
import { initBoard, CN, line, mark } from './board';
import { legalMoves } from './rules';
import { selectAiMove } from './ai';

export default function XiangqiGame({ isMobile = false, onExit }: XiangqiGameProps) {
  const { t } = useLocale();

  const m = isMobile ? 22 : 36;
  const s = isMobile ? 40 : 60;
  const w = m * 2 + s * 8 + 4;
  const h = m * 2 + s * 9 + 4;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('');
  const [aiLabel, setAiLabel] = useState('');

  const gRef = useRef<GameState>({
    bd: initBoard(),
    turn: 'r',
    sel: null,
    legal: [],
    history: [],
    over: false,
    vsAI: true
  });

  const sizeRef = useRef({ M: m, S: s, W: w, H: h });
  sizeRef.current = { M: m, S: s, W: w, H: h };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const CX = canvas.getContext('2d')!;
    const g = gRef.current;
    const { M, S, W, H } = sizeRef.current;
    const { bd, sel, legal } = g;

    CX.clearRect(0, 0, W, H);
    CX.strokeStyle = '#5a3a1a';
    CX.lineWidth = 2;
    CX.strokeRect(M, M, S * 8, S * 9);
    CX.lineWidth = 1;

    for (let r = 0; r < 10; r++) line(CX, M, M + r * S, M + S * 8, M + r * S);
    for (let c = 0; c < 9; c++) {
      if (c === 0 || c === 8) {
        line(CX, M + c * S, M, M + c * S, M + S * 9);
      } else {
        line(CX, M + c * S, M, M + c * S, M + S * 4);
        line(CX, M + c * S, M + S * 5, M + c * S, M + S * 9);
      }
    }

    CX.lineWidth = 1.5;
    line(CX, M + 3 * S, M, M + 5 * S, M + 2 * S);
    line(CX, M + 5 * S, M, M + 3 * S, M + 2 * S);
    line(CX, M + 3 * S, M + 7 * S, M + 5 * S, M + 9 * S);
    line(CX, M + 5 * S, M + 7 * S, M + 3 * S, M + 9 * S);
    CX.lineWidth = 1;

    [[2, 1], [2, 7], [7, 1], [7, 7], [3, 0], [3, 2], [3, 4], [3, 6], [3, 8], [6, 0], [6, 2], [6, 4], [6, 6], [6, 8]]
      .forEach(([r, c]) => mark(CX, M, S, r, c));

    CX.fillStyle = '#5a3a1a';
    CX.font = `bold ${S * 0.5}px KaiTi,serif`;
    CX.textAlign = 'center';
    CX.textBaseline = 'middle';
    CX.fillText('楚 河', M + 2 * S, M + 4.5 * S);
    CX.fillText('汉 界', M + 6 * S, M + 4.5 * S);

    if (sel) {
      CX.fillStyle = 'rgba(46,125,50,.35)';
      CX.beginPath();
      CX.arc(M + sel[1] * S, M + sel[0] * S, S * 0.46, 0, 7);
      CX.fill();
      legal.forEach(([r, c]) => {
        CX.fillStyle = bd[r][c] ? 'rgba(198,40,40,.55)' : 'rgba(46,125,50,.5)';
        CX.beginPath();
        CX.arc(M + c * S, M + r * S, S * 0.14, 0, 7);
        CX.fill();
      });
    }

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = bd[r][c];
        if (!p) continue;
        const x = M + c * S, y = M + r * S;
        CX.beginPath();
        CX.arc(x, y, S * 0.42, 0, 7);
        CX.fillStyle = '#fff8e7';
        CX.fill();
        CX.lineWidth = 2;
        CX.strokeStyle = '#5a3a1a';
        CX.stroke();
        CX.beginPath();
        CX.arc(x, y, S * 0.34, 0, 7);
        CX.lineWidth = 1;
        CX.stroke();
        CX.fillStyle = p.side === 'r' ? '#c62828' : '#1a1a1a';
        CX.font = `bold ${S * 0.5}px KaiTi,serif`;
        CX.fillText(CN[p.type][p.side === 'r' ? 0 : 1], x, y + 1);
      }
    }
  };

  const doMove = (mv: Move) => {
    const g = gRef.current;
    g.history.push({ bd: g.bd.map(r => r.slice()), turn: g.turn });
    g.bd[mv.tr][mv.tc] = g.bd[mv.fr][mv.fc];
    g.bd[mv.fr][mv.fc] = null;
    g.sel = null;
    g.legal = [];
    g.turn = g.turn === 'r' ? 'b' : 'r';

    const moves = legalMoves(g.bd, g.turn);
    if (moves.length === 0) {
      g.over = true;
      // 无子可动判胜负
      if (g.turn === 'r') {
        setStatus(t('xiangqi.status.blackWinStalemate'));
      } else {
        setStatus(t('xiangqi.status.redWinStalemate'));
      }
    } else {
      setStatus(g.turn === 'r' ? t('xiangqi.status.redTurn') : t('xiangqi.status.blackTurn'));
    }
    draw();

    if (!g.over && g.vsAI && g.turn === 'b') {
      setTimeout(() => {
        const aiMv = selectAiMove(g.bd);
        if (aiMv) doMove(aiMv);
      }, 300);
    }
  };

  const newGame = () => {
    const g = gRef.current;
    g.bd = initBoard();
    g.turn = 'r';
    g.sel = null;
    g.legal = [];
    g.history = [];
    g.over = false;
    setStatus(t('xiangqi.status.redTurn'));
    setAiLabel(g.vsAI ? t('xiangqi.btn.aiOn') : t('xiangqi.btn.aiOff'));
    draw();
  };

  useEffect(() => {
    setAiLabel(gRef.current.vsAI ? t('xiangqi.btn.aiOn') : t('xiangqi.btn.aiOff'));
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handler = (e: MouseEvent) => {
      const g = gRef.current;
      const { M, S, W, H } = sizeRef.current;
      if (g.over) return;
      if (g.vsAI && g.turn === 'b') return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const c = Math.round(((e.clientX - rect.left) * scaleX - M) / S);
      const r = Math.round(((e.clientY - rect.top) * scaleY - M) / S);
      if (r < 0 || r > 9 || c < 0 || c > 8) return;

      const p = g.bd[r][c];
      if (g.sel) {
        const ok = g.legal.some(m => m[0] === r && m[1] === c);
        if (ok) {
          doMove({ fr: g.sel[0], fc: g.sel[1], tr: r, tc: c, cap: g.bd[r][c] });
          return;
        }
      }
      if (p && p.side === g.turn) {
        g.sel = [r, c];
        g.legal = legalMoves(g.bd, g.turn).filter(m => m.fr === r && m.fc === c).map(m => [m.tr, m.tc]);
      } else {
        g.sel = null;
      }
      draw();
    };

    canvas.addEventListener('click', handler);
    newGame();
    return () => canvas.removeEventListener('click', handler);
  }, [t]);

  useEffect(() => {
    draw();
  }, [isMobile]);

  const btnStyle = (isMobileFlag: boolean): React.CSSProperties => ({
    padding: isMobileFlag ? '6px 12px' : '8px 18px',
    fontSize: isMobileFlag ? 13 : 15,
    border: 'none',
    borderRadius: 6,
    background: '#8b4513',
    color: '#fff',
    cursor: 'pointer'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? 8 : 16, background: '#f5e6c8', fontFamily: '"Microsoft YaHei",sans-serif' }}>
      <h1 style={{ color: '#8b4513', margin: '6px 0', fontSize: isMobile ? 20 : 26 }}>{t('xiangqi.title')}</h1>
      <div style={{ fontSize: isMobile ? 14 : 17, margin: '4px 0 8px', color: '#5a3a1a', minHeight: 22 }}>{status}</div>
      <canvas ref={canvasRef} width={w} height={h}
        style={{ background: '#eac894', border: '3px solid #8b4513', borderRadius: 6, boxShadow: '0 4px 14px rgba(0,0,0,.25)', touchAction: 'none', maxWidth: '100%', height: 'auto' }} />
      <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={newGame} style={btnStyle(isMobile)}>{t('xiangqi.btn.newGame')}</button>
        <button onClick={() => {
          const g = gRef.current;
          if (g.vsAI) g.history.pop();
          const hItem = g.history.pop();
          if (hItem) {
            g.bd = hItem.bd;
            g.turn = hItem.turn;
            g.over = false;
            g.sel = null;
            g.legal = [];
            setStatus(g.turn === 'r' ? t('xiangqi.status.redTurn') : t('xiangqi.status.blackTurn'));
            draw();
          }
        }} style={btnStyle(isMobile)}>{t('xiangqi.btn.undo')}</button>
        <button onClick={() => {
          const g = gRef.current;
          g.vsAI = !g.vsAI;
          const label = g.vsAI ? t('xiangqi.btn.aiOn') : t('xiangqi.btn.aiOff');
          setAiLabel(label);
          newGame();
        }} style={{ ...btnStyle(isMobile), background: '#2e7d32' }}>
          {t('xiangqi.btn.aiToggle')}{aiLabel}
        </button>
        {onExit && <button onClick={onExit} style={{ ...btnStyle(isMobile), background: '#666' }}>{t('xiangqi.btn.exitLobby')}</button>}
      </div>
    </div>
  );
}
