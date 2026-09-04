import React, { useRef, useEffect, useState } from 'react';
import { useLocale } from '../../store/LocaleContext';

type Side = 'r' | 'b';
interface Piece { side: Side; type: string; }
interface Move { fr: number; fc: number; tr: number; tc: number; cap: Piece | null; }
interface HistoryItem { bd: (Piece | null)[][]; turn: Side; }
interface XiangqiGameProps { isMobile?: boolean; onExit?: () => void; }

const CN: Record<string, [string, string]> = {
  K: ['帅', '将'], A: ['仕', '士'], B: ['相', '象'],
  N: ['马', '马'], R: ['车', '车'], C: ['炮', '炮'], P: ['兵', '卒']
};
const VAL: Record<string, number> = { K: 10000, R: 600, N: 270, C: 300, B: 120, A: 120, P: 60 };

function initBoard(): (Piece | null)[][] {
  const b: (Piece | null)[][] = Array.from({ length: 10 }, () => Array(9).fill(null));
  const put = (r: number, c: number, s: Side, t: string) => { b[r][c] = { side: s, type: t }; };
  put(0, 0, 'b', 'R'); put(0, 1, 'b', 'N'); put(0, 2, 'b', 'B'); put(0, 3, 'b', 'A'); put(0, 4, 'b', 'K');
  put(0, 5, 'b', 'A'); put(0, 6, 'b', 'B'); put(0, 7, 'b', 'N'); put(0, 8, 'b', 'R');
  put(2, 1, 'b', 'C'); put(2, 7, 'b', 'C');
  put(3, 0, 'b', 'P'); put(3, 2, 'b', 'P'); put(3, 4, 'b', 'P'); put(3, 6, 'b', 'P'); put(3, 8, 'b', 'P');
  put(9, 0, 'r', 'R'); put(9, 1, 'r', 'N'); put(9, 2, 'r', 'B'); put(9, 3, 'r', 'A'); put(9, 4, 'r', 'K');
  put(9, 5, 'r', 'A'); put(9, 6, 'r', 'B'); put(9, 7, 'r', 'N'); put(9, 8, 'r', 'R');
  put(7, 1, 'r', 'C'); put(7, 7, 'r', 'C');
  put(6, 0, 'r', 'P'); put(6, 2, 'r', 'P'); put(6, 4, 'r', 'P'); put(6, 6, 'r', 'P'); put(6, 8, 'r', 'P');
  return b;
}

function inPalace(side: Side, r: number, c: number): boolean {
  if (c < 3 || c > 5) return false;
  return side === 'r' ? r >= 7 : r <= 2;
}

function pseudo(bd: (Piece | null)[][], r: number, c: number): [number, number][] {
  const p = bd[r][c]; if (!p) return [];
  const mv: [number, number][] = []; const own = p.side;
  const add = (nr: number, nc: number) => { const q = bd[nr][nc]; if (!q || q.side !== own) mv.push([nr, nc]); };
  switch (p.type) {
    case 'K':
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{
        const nr=r+dr,nc=c+dc;
        if(nr>=0&&nr<10&&nc>=0&&nc<9&&inPalace(own,nr,nc)) add(nr,nc);
      });
      { const gr=own==='r'?0:9; let clear=true;
        for(let i=Math.min(r,gr)+1;i<Math.max(r,gr);i++) if(bd[i][c]) clear=false;
        if(clear&&r!==gr){ const g=bd[gr][c]; if(g&&g.type==='K'&&g.side!==own) mv.push([gr,c]); } }
      break;
    case 'A':
      [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{
        const nr=r+dr,nc=c+dc;
        if(nr>=0&&nr<10&&nc>=0&&nc<9&&inPalace(own,nr,nc)) add(nr,nc);
      });
      break;
    case 'B': {
      const river=own==='r'?5:4;
      [[2,2],[2,-2],[-2,2],[-2,-2]].forEach(([dr,dc])=>{
        const nr=r+dr,nc=c+dc;
        if(nr<0||nr>9||nc<0||nc>8) return;
        if(own==='r'&&nr<river) return;
        if(own==='b'&&nr>river) return;
        if(!bd[r+dr/2][c+dc/2]) add(nr,nc);
      });
      break; }
    case 'N': {
      const legs=[[-1,0],[-1,0],[1,0],[1,0],[0,-1],[0,-1],[0,1],[0,1]];
      const dirs=[[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[1,-2],[-1,2],[1,2]];
      dirs.forEach(([dr,dc],i)=>{
        const nr=r+dr,nc=c+dc,[lr,lc]=legs[i];
        if(nr<0||nr>9||nc<0||nc>8) return;
        if(bd[r+lr][c+lc]) return;
        add(nr,nc);
      });
      break; }
    case 'R': {
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{
        let nr=r+dr,nc=c+dc;
        while(nr>=0&&nr<10&&nc>=0&&nc<9){
          if(!bd[nr][nc]) mv.push([nr,nc]);
          else { if(bd[nr][nc]!.side!==own) mv.push([nr,nc]); break; }
          nr+=dr; nc+=dc;
        }
      });
      break; }
    case 'C': {
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{
        let nr=r+dr,nc=c+dc,jumped=false;
        while(nr>=0&&nr<10&&nc>=0&&nc<9){
          if(!jumped){ if(!bd[nr][nc]) mv.push([nr,nc]); else jumped=true; }
          else if(bd[nr][nc]){ if(bd[nr][nc]!.side!==own) mv.push([nr,nc]); break; }
          nr+=dr; nc+=dc;
        }
      });
      break; }
    case 'P': {
      const fwd=own==='r'?-1:1;
      if(r+fwd>=0&&r+fwd<10) add(r+fwd,c);
      const crossed=own==='r'?r<=4:r>=5;
      if(crossed){ if(c>0) add(r,c-1); if(c<8) add(r,c+1); }
      break; }
  }
  return mv;
}

function genPos(bd: (Piece | null)[][], side: Side): [number,number]|null {
  for(let r=0;r<10;r++) for(let c=0;c<9;c++){ const p=bd[r][c]; if(p&&p.side===side&&p.type==='K') return [r,c]; }
  return null;
}

function inCheck(bd: (Piece | null)[][], side: Side): boolean {
  const gp=genPos(bd,side); if(!gp) return false;
  const foe=side==='r'?'b':'r';
  for(let r=0;r<10;r++) for(let c=0;c<9;c++){ const p=bd[r][c]; if(p&&p.side===foe&&pseudo(bd,r,c).some(([nr,nc])=>nr===gp[0]&&nc===gp[1])) return true; }
  return false;
}

function legalMoves(bd: (Piece | null)[][], side: Side): Move[] {
  const out: Move[]=[];
  for(let r=0;r<10;r++) for(let c=0;c<9;c++){
    const p=bd[r][c]; if(!p||p.side!==side) continue;
    for(const [nr,nc] of pseudo(bd,r,c)){
      const cap=bd[nr][nc]; bd[nr][nc]=p; bd[r][c]=null;
      if(!inCheck(bd,side)) out.push({fr:r,fc:c,tr:nr,tc:nc,cap});
      bd[r][c]=p; bd[nr][nc]=cap;
    }
  }
  return out;
}

interface G { bd:(Piece|null)[][]; turn:Side; sel:[number,number]|null; legal:[number,number][]; history:HistoryItem[]; over:boolean; vsAI:boolean; }

export default function XiangqiGame({ isMobile = false, onExit }: XiangqiGameProps){
  const { t } = useLocale();
  const m = isMobile ? 22 : 36;
  const s = isMobile ? 40 : 60;
  const w = m * 2 + s * 8 + 4;
  const h = m * 2 + s * 9 + 4;
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [status,setStatus]=useState('');
  const [aiLabel,setAiLabel]=useState('');
  const gRef=useRef<G>({bd:initBoard(),turn:'r',sel:null,legal:[],history:[],over:false,vsAI:true});
  const sizeRef=useRef({M:m,S:s,W:w,H:h});
  sizeRef.current={M:m,S:s,W:w,H:h};

  const draw=()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const CX=canvas.getContext('2d')!; const g=gRef.current;
    const {M,S,W,H}=sizeRef.current; const {bd,sel,legal}=g;
    CX.clearRect(0,0,W,H); CX.strokeStyle='#5a3a1a'; CX.lineWidth=2;
    CX.strokeRect(M,M,S*8,S*9); CX.lineWidth=1;
    for(let r=0;r<10;r++) line(CX,M,M+r*S,M+S*8,M+r*S);
    for(let c=0;c<9;c++){
      if(c===0||c===8){ line(CX,M+c*S,M,M+c*S,M+S*9); }
      else { line(CX,M+c*S,M,M+c*S,M+S*4); line(CX,M+c*S,M+S*5,M+c*S,M+S*9); }
    }
    CX.lineWidth=1.5;
    line(CX,M+3*S,M,M+5*S,M+2*S); line(CX,M+5*S,M,M+3*S,M+2*S);
    line(CX,M+3*S,M+7*S,M+5*S,M+9*S); line(CX,M+5*S,M+7*S,M+3*S,M+9*S);
    CX.lineWidth=1;
    [[2,1],[2,7],[7,1],[7,7],[3,0],[3,2],[3,4],[3,6],[3,8],[6,0],[6,2],[6,4],[6,6],[6,8]].forEach(([r,c])=>mark(CX,M,S,r,c));
    CX.fillStyle='#5a3a1a'; CX.font=`bold ${S*0.5}px KaiTi,serif`; CX.textAlign='center'; CX.textBaseline='middle';
    CX.fillText('楚 河',M+2*S,M+4.5*S); CX.fillText('汉 界',M+6*S,M+4.5*S);
    if(sel){
      CX.fillStyle='rgba(46,125,50,.35)'; CX.beginPath(); CX.arc(M+sel[1]*S,M+sel[0]*S,S*0.46,0,7); CX.fill();
      legal.forEach(([r,c])=>{
        CX.fillStyle=bd[r][c]?'rgba(198,40,40,.55)':'rgba(46,125,50,.5)';
        CX.beginPath(); CX.arc(M+c*S,M+r*S,S*0.14,0,7); CX.fill();
      });
    }
    for(let r=0;r<10;r++) for(let c=0;c<9;c++){
      const p=bd[r][c]; if(!p) continue;
      const x=M+c*S,y=M+r*S;
      CX.beginPath(); CX.arc(x,y,S*0.42,0,7); CX.fillStyle='#fff8e7'; CX.fill();
      CX.lineWidth=2; CX.strokeStyle='#5a3a1a'; CX.stroke();
      CX.beginPath(); CX.arc(x,y,S*0.34,0,7); CX.lineWidth=1; CX.stroke();
      CX.fillStyle=p.side==='r'?'#c62828':'#1a1a1a'; CX.font=`bold ${S*0.5}px KaiTi,serif`;
      CX.fillText(CN[p.type][p.side==='r'?0:1],x,y+1);
    }
  };

  const doMove=(mv:Move)=>{
    const g=gRef.current;
    g.history.push({bd:g.bd.map(r=>r.slice()),turn:g.turn});
    g.bd[mv.tr][mv.tc]=g.bd[mv.fr][mv.fc]; g.bd[mv.fr][mv.fc]=null;
    g.sel=null; g.legal=[]; g.turn=g.turn==='r'?'b':'r';
    const moves=legalMoves(g.bd,g.turn);
    if(moves.length===0){
      g.over=true;
      if(inCheck(g.bd,g.turn)){
        setStatus(g.turn==='r' ? t('xiangqi.status.blackWin') : t('xiangqi.status.redWin'));
      }else{
        setStatus(g.turn==='r' ? t('xiangqi.status.blackWinStalemate') : t('xiangqi.status.redWinStalemate'));
      }
    }
    else {
      setStatus(g.turn==='r' ? t('xiangqi.status.redTurn') : t('xiangqi.status.blackTurn'));
    }
    draw();
    if(!g.over&&g.vsAI&&g.turn==='b') setTimeout(aiMove,300);
  };

  const aiMove=()=>{
    const g=gRef.current; const moves=legalMoves(g.bd,'b'); if(!moves.length) return;
    let best:Move|null=null,bs=-1e9;
    for(const mv of moves){
      let sc=Math.random()*5; if(mv.cap) sc+=VAL[mv.cap.type];
      const p=g.bd[mv.fr][mv.fc]!; g.bd[mv.tr][mv.tc]=p; g.bd[mv.fr][mv.fc]=null;
      if(inCheck(g.bd,'r')) sc+=80;
      for(let r=0;r<10;r++)for(let c=0;c<9;c++){ const q=g.bd[r][c]; if(q&&q.side==='r'&&pseudo(g.bd,r,c).some(([a,b])=>a===mv.tr&&b===mv.tc)) sc-=VAL[p.type]*0.9; }
      g.bd[mv.fr][mv.fc]=p; g.bd[mv.tr][mv.tc]=mv.cap;
      if(sc>bs){bs=sc;best=mv;}
    }
    if(best) doMove(best);
  };

  const newGame=()=>{
    const g=gRef.current;
    g.bd=initBoard(); g.turn='r'; g.sel=null; g.legal=[]; g.history=[]; g.over=false;
    setStatus(t('xiangqi.status.redTurn'));
    setAiLabel(g.vsAI ? t('xiangqi.btn.aiOn') : t('xiangqi.btn.aiOff'));
    draw();
  };

  useEffect(()=>{
    setAiLabel(gRef.current.vsAI ? t('xiangqi.btn.aiOn') : t('xiangqi.btn.aiOff'));
    const canvas=canvasRef.current; if(!canvas) return;
    const handler=(e:MouseEvent)=>{
      const g=gRef.current; const {M,S,W,H}=sizeRef.current;
      if(g.over) return; if(g.vsAI&&g.turn==='b') return;
      const rect=canvas.getBoundingClientRect();
      const scaleX=W/rect.width,scaleY=H/rect.height;
      const c=Math.round(((e.clientX-rect.left)*scaleX-M)/S);
      const r=Math.round(((e.clientY-rect.top)*scaleY-M)/S);
      if(r<0||r>9||c<0||c>8) return;
      const p=g.bd[r][c];
      if(g.sel){
        const ok=g.legal.some(m=>m[0]===r&&m[1]===c);
        if(ok){ doMove({fr:g.sel[0],fc:g.sel[1],tr:r,tc:c,cap:g.bd[r][c]}); return; }
      }
      if(p&&p.side===g.turn){ g.sel=[r,c]; g.legal=legalMoves(g.bd,g.turn).filter(m=>m.fr===r&&m.fc===c).map(m=>[m.tr,m.tc]); }
      else g.sel=null;
      draw();
    };
    canvas.addEventListener('click',handler);
    newGame();
    return ()=>canvas.removeEventListener('click',handler);
  },[t]);

  useEffect(()=>{ draw(); },[isMobile]);

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:isMobile?8:16,background:'#f5e6c8',fontFamily:'"Microsoft YaHei",sans-serif'}}>
      <h1 style={{color:'#8b4513',margin:'6px 0',fontSize:isMobile?20:26}}>{t('xiangqi.title')}</h1>
      <div style={{fontSize:isMobile?14:17,margin:'4px 0 8px',color:'#5a3a1a',minHeight:22}}>{status}</div>
      <canvas ref={canvasRef} width={w} height={h}
        style={{background:'#eac894',border:'3px solid #8b4513',borderRadius:6,boxShadow:'0 4px 14px rgba(0,0,0,.25)',touchAction:'none',maxWidth:'100%',height:'auto'}} />
      <div style={{marginTop:12,display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
        <button onClick={newGame} style={btn(isMobile)}>{t('xiangqi.btn.newGame')}</button>
        <button onClick={()=>{
          const g=gRef.current; if(g.vsAI) g.history.pop();
          const h=g.history.pop(); if(h){ g.bd=h.bd; g.turn=h.turn; g.over=false; g.sel=null; g.legal=[]; setStatus(g.turn==='r'?t('xiangqi.status.redTurn'):t('xiangqi.status.blackTurn')); draw(); }
        }} style={btn(isMobile)}>{t('xiangqi.btn.undo')}</button>
        <button onClick={()=>{
          const g=gRef.current; g.vsAI=!g.vsAI;
          const label = g.vsAI ? t('xiangqi.btn.aiOn') : t('xiangqi.btn.aiOff');
          setAiLabel(label);
          newGame();
        }} style={{...btn(isMobile),background:'#2e7d32'}}>
          {t('xiangqi.btn.aiToggle')}{aiLabel}
        </button>
        {onExit && <button onClick={onExit} style={{...btn(isMobile),background:'#666'}}>{t('xiangqi.btn.exitLobby')}</button>}
      </div>
    </div>
  );
}

const btn=(isMobile:boolean): React.CSSProperties => ({ padding:isMobile?'6px 12px':'8px 18px',fontSize:isMobile?13:15,border:'none',borderRadius:6,background:'#8b4513',color:'#fff',cursor:'pointer' });

function line(CX:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number){ CX.beginPath();CX.moveTo(x1,y1);CX.lineTo(x2,y2);CX.stroke(); }
function mark(CX:CanvasRenderingContext2D,M:number,S:number,r:number,c:number){
  const x=M+c*S,y=M+r*S,d=S*0.12,g=S*0.06;
  [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sx,sy])=>{
    const px=x+sx*g,py=y+sy*g; CX.beginPath(); CX.moveTo(px+sx*d,py);CX.lineTo(px,py);CX.lineTo(px,py+sy*d);CX.stroke();
  });
}
