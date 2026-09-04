import { useRef, useEffect, useState } from 'react';

type Animal = 'elephant' | 'lion' | 'tiger' | 'leopard' | 'wolf' | 'dog' | 'cat' | 'mouse';
type Side = 'red' | 'blue';

interface JunglePiece {
  animal: Animal;
  side: Side;
  x: number;
  y: number;
  inRiver: boolean;
}
type CellType = 'normal' | 'river' | 'trap' | 'den';

const RANK_MAP: Record<Animal, number> = {
  elephant: 8,
  lion: 7,
  tiger: 6,
  leopard:5,
  wolf:4,
  dog:3,
  cat:2,
  mouse:1
};
const PIECE_SCORE:Record<Animal,number> = {
  elephant:100,
  lion:90,
  tiger:85,
  leopard:70,
  wolf:60,
  dog:50,
  cat:40,
  mouse:35
};

const createBoardCellType = (): CellType[][] => {
  const grid: CellType[][] = Array.from({length:9}, ()=>Array(7).fill('normal'));
  for(let y=3;y<=4;y++){
    grid[y][1] = 'river';
    grid[y][2] = 'river';
    grid[y][4] = 'river';
    grid[y][5] = 'river';
  }
  grid[0][3] = 'den';
  grid[8][3] = 'den';
  grid[0][2] = 'trap'; grid[0][4] = 'trap'; grid[1][3] = 'trap';
  grid[8][2] = 'trap'; grid[8][4] = 'trap'; grid[7][3] = 'trap';
  return grid;
};

const initPieces = ():JunglePiece[]=>{
  return [
    {animal:'lion',side:'red',x:0,y:0,inRiver:false},
    {animal:'tiger',side:'red',x:6,y:0,inRiver:false},
    {animal:'elephant',side:'red',x:2,y:1,inRiver:false},
    {animal:'leopard',side:'red',x:4,y:1,inRiver:false},
    {animal:'wolf',side:'red',x:1,y:2,inRiver:false},
    {animal:'dog',side:'red',x:5,y:2,inRiver:false},
    {animal:'cat',side:'red',x:0,y:2,inRiver:false},
    {animal:'mouse',side:'red',x:6,y:2,inRiver:false},

    {animal:'lion',side:'blue',x:6,y:8,inRiver:false},
    {animal:'tiger',side:'blue',x:0,y:8,inRiver:false},
    {animal:'elephant',side:'blue',x:4,y:7,inRiver:false},
    {animal:'leopard',side:'blue',x:2,y:7,inRiver:false},
    {animal:'wolf',side:'blue',x:5,y:6,inRiver:false},
    {animal:'dog',side:'blue',x:1,y:6,inRiver:false},
    {animal:'cat',side:'blue',x:6,y:6,inRiver:false},
    {animal:'mouse',side:'blue',x:0,y:6,inRiver:false},
  ];
};

interface DragState{
  active:boolean;
  piece:JunglePiece|null;
  hoverX:number|null;
  hoverY:number|null;
}

function clonePieces(list:JunglePiece[]):JunglePiece[]{
  return list.map(p=>({...p}));
}

function getPieceAt(pieces:JunglePiece[],x:number,y:number):JunglePiece|undefined{
  return pieces.find(p=>p.x===x && p.y===y);
}

function canEat(attacker:JunglePiece, defender:JunglePiece, cellType:CellType[][]):boolean{
  const tx = attacker.x, ty = attacker.y;
  const dx = defender.x, dy = defender.y;
  const tCell = cellType[ty][tx];
  const dCell = cellType[dy][dx];

  let atkRank = RANK_MAP[attacker.animal];
  let defRank = RANK_MAP[defender.animal];
  if(tCell === 'trap') atkRank = 0;
  if(dCell === 'trap') defRank = 0;

  if(attacker.animal === 'mouse' && defender.animal === 'elephant') return true;
  if(attacker.animal === 'elephant' && defender.animal === 'mouse') return false;

  if(defender.inRiver && !attacker.inRiver) return false;
  return atkRank >= defRank;
}

function hasMouseInRiverLine(pieces:JunglePiece[], y:number, xStart:number, xEnd:number){
  return pieces.some(p=>
    p.y === y
    && p.animal === 'mouse'
    && p.x >= xStart
    && p.x <= xEnd
    && p.inRiver
  );
}

function getValidMoves(pieces:JunglePiece[],piece:JunglePiece,cellType:CellType[][]):[number,number][]{
  const moves:[number,number][] = [];
  const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
  const {x,y} = piece;

  for(const [dx,dy] of dirs){
    const nx = x+dx;
    const ny = y+dy;
    if(nx<0||nx>=7||ny<0||ny>=9) continue;
    const targetCell = cellType[ny][nx];
    if(targetCell === 'river' && piece.animal !== 'mouse') continue;

    const targetPiece = getPieceAt(pieces,nx,ny);
    if(targetPiece){
      if(targetPiece.side === piece.side) continue;
      if(!canEat(piece,targetPiece,cellType)) continue;
    }
    moves.push([nx,ny]);
  }

  if(piece.animal === 'lion' || piece.animal === 'tiger'){
    if((y ===3 || y===4) && x ===0){
      if(!hasMouseInRiverLine(pieces,y,1,2)){
        const jumpX = 3;
        const targetPiece = getPieceAt(pieces,jumpX,y);
        if(!targetPiece || (targetPiece.side!==piece.side && canEat(piece,targetPiece,cellType))){
          moves.push([jumpX,y]);
        }
      }
    }
    if((y ===3 || y===4) && x ===3){
      if(!hasMouseInRiverLine(pieces,y,1,2)){
        const jumpX = 0;
        const targetPiece = getPieceAt(pieces,jumpX,y);
        if(!targetPiece || (targetPiece.side!==piece.side && canEat(piece,targetPiece,cellType))){
          moves.push([jumpX,y]);
        }
      }
    }
    if((y ===3 || y===4) && x ===3){
      if(!hasMouseInRiverLine(pieces,y,4,5)){
        const jumpX =6;
        const targetPiece = getPieceAt(pieces,jumpX,y);
        if(!targetPiece || (targetPiece.side!==piece.side && canEat(piece,targetPiece,cellType))){
          moves.push([jumpX,y]);
        }
      }
    }
    if((y ===3 || y===4) && x ===6){
      if(!hasMouseInRiverLine(pieces,y,4,5)){
        const jumpX =3;
        const targetPiece = getPieceAt(pieces,jumpX,y);
        if(!targetPiece || (targetPiece.side!==piece.side && canEat(piece,targetPiece,cellType))){
          moves.push([jumpX,y]);
        }
      }
    }
  }

  return moves;
}

function getAllMoves(pieces:JunglePiece[],side:Side,cellType:CellType[][]){
  const result:{piece:JunglePiece,toX:number,toY:number}[]=[];
  pieces.filter(p=>p.side===side).forEach(p=>{
    const ms = getValidMoves(pieces,p,cellType);
    ms.forEach(([tx,ty])=>{
      result.push({piece:p,toX:tx,toY:ty});
    });
  });
  return result;
}

function evaluate(pieces:JunglePiece[],cellType:CellType[][]):number{
  let score = 0;
  const redElephant = pieces.find(p=>p.side==='red'&&p.animal==='elephant');
  for(const p of pieces){
    let s = PIECE_SCORE[p.animal];
    if(cellType[p.y][p.x]==='trap') {
      s *=0.25;
    }
    if(p.animal==='mouse' && p.inRiver){
      s +=18;
    }

    if(p.side==='blue'){
      const distToDen = Math.abs(p.x-3)+Math.abs(p.y-0);
      s += (18-distToDen)*2.5;
      if(p.animal==='mouse' && redElephant){
        const d = Math.abs(p.x-redElephant.x)+Math.abs(p.y-redElephant.y);
        s += Math.max(0,22-d)*2;
      }
      score += s;
    }else{
      const distToDen = Math.abs(p.x-3)+Math.abs(p.y-8);
      s += (18-distToDen)*2.5;
      score -= s;
    }
  }
  return score;
}

function minimax(pieces:JunglePiece[],depth:number,alpha:number,beta:number,isAiTurn:boolean,cellType:CellType[][]):number{
  const blueDen = getPieceAt(pieces,3,0);
  const redDen = getPieceAt(pieces,3,8);
  if(blueDen && blueDen.side === 'blue') return 9999;
  if(redDen && redDen.side === 'red') return -9999;
  if(depth <= 0){
    return evaluate(pieces,cellType);
  }

  if(isAiTurn){
    let maxVal = -Infinity;
    const moves = getAllMoves(pieces,'blue',cellType);
    for(const mv of moves){
      const sim = clonePieces(pieces);
      const simPiece = sim.find(pp=>pp.x===mv.piece.x && pp.y===mv.piece.y)!;
      const idx = sim.findIndex(pp=>pp.x===mv.toX && pp.y===mv.toY);
      if(idx!==-1) sim.splice(idx,1);
      simPiece.x = mv.toX;
      simPiece.y = mv.toY;
      simPiece.inRiver = cellType[mv.toY][mv.toX]==='river';

      const val = minimax(sim,depth-1,alpha,beta,false,cellType);
      maxVal = Math.max(maxVal,val);
      alpha = Math.max(alpha,val);
      if(beta <= alpha) break;
    }
    return maxVal;
  }else{
    let minVal = Infinity;
    const moves = getAllMoves(pieces,'red',cellType);
    for(const mv of moves){
      const sim = clonePieces(pieces);
      const simPiece = sim.find(pp=>pp.x===mv.piece.x && pp.y===mv.piece.y)!;
      const idx = sim.findIndex(pp=>pp.x===mv.toX && pp.y===mv.toY);
      if(idx!==-1) sim.splice(idx,1);
      simPiece.x = mv.toX;
      simPiece.y = mv.toY;
      simPiece.inRiver = cellType[mv.toY][mv.toX]==='river';

      const val = minimax(sim,depth-1,alpha,beta,true,cellType);
      minVal = Math.min(minVal,val);
      beta = Math.min(beta,val);
      if(beta <= alpha) break;
    }
    return minVal;
  }
}

function searchBestMove(pieces:JunglePiece[],cellType:CellType[][],searchDepth=2):{piece:JunglePiece,toX:number,toY:number}|null{
  const allMoves = getAllMoves(pieces,'blue',cellType);
  if(allMoves.length===0) return null;
  let bestMove = allMoves[0];
  let bestScore = -Infinity;

  for(const mv of allMoves){
    const sim = clonePieces(pieces);
    const simPiece = sim.find(pp=>pp.x===mv.piece.x && pp.y===mv.piece.y)!;
    const idx = sim.findIndex(pp=>pp.x===mv.toX && pp.y===mv.toY);
    if(idx!==-1) sim.splice(idx,1);
    simPiece.x = mv.toX;
    simPiece.y = mv.toY;
    simPiece.inRiver = cellType[mv.toY][mv.toX]==='river';

    const score = minimax(sim,searchDepth-1,-Infinity,Infinity,false,cellType);
    if(score>bestScore){
      bestScore = score;
      bestMove = mv;
    }
  }
  return bestMove;
}

export default function JungleGame(){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CELL_SIZE = 60;
  const BOARD_WIDTH = 7*CELL_SIZE;
  const BOARD_HEIGHT =9*CELL_SIZE;

  const cellType = useRef(createBoardCellType());
  const piecesRef = useRef<JunglePiece[]>(initPieces());
  const turnRef = useRef<Side>('red');
  const gameOverRef = useRef(false);
  const [statusText,setStatusText] = useState("红方走棋");

  const dragRef = useRef<DragState>({active:false,piece:null,hoverX:null,hoverY:null});
  const selectedPieceRef = useRef<JunglePiece|null>(null);
  const flashFrameRef = useRef(0);
  const animRef = useRef<number>(0);

  function aiMakeMove(){
    if(gameOverRef.current) return;
    const best = searchBestMove(piecesRef.current,cellType.current,2);
    if(!best){
      setStatusText("AI无棋可走，红方胜利");
      gameOverRef.current=true;
      return;
    }
    const targetIdx = piecesRef.current.findIndex(p=>p.x===best.toX && p.y===best.toY);
    if(targetIdx!==-1){
      piecesRef.current.splice(targetIdx,1);
    }
    best.piece.x = best.toX;
    best.piece.y = best.toY;
    best.piece.inRiver = cellType.current[best.toY][best.toX]==='river';

    if(cellType.current[best.toY][best.toX]==='den'){
      gameOverRef.current = true;
      setStatusText("蓝方AI获胜！");
      return;
    }
    turnRef.current = 'red';
    setStatusText("红方走棋");
  }

  const draw = ()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    ctx.clearRect(0,0,BOARD_WIDTH,BOARD_HEIGHT);

    // 绘制棋盘格子，y做镜像：visualY = 8‑y
    for(let y=0;y<9;y++){
      for(let x=0;x<7;x++){
        const ct = cellType.current[y][x];
        const visualY = 8 - y;
        ctx.fillStyle = '#f3e2bc';
        if(ct === 'river') ctx.fillStyle = '#63a8e8';
        if(ct === 'trap') ctx.fillStyle = '#ffd8a8';
        if(ct === 'den') ctx.fillStyle = '#ffaaaa';
        ctx.fillRect(x*CELL_SIZE, visualY*CELL_SIZE, CELL_SIZE-1, CELL_SIZE-1);
      }
    }

    // 绘制可行点
    if(selectedPieceRef.current){
      const valid = getValidMoves(piecesRef.current, selectedPieceRef.current, cellType.current);
      for(const [mx,my] of valid){
        const targetPc = getPieceAt(piecesRef.current,mx,my);
        const visualMy = 8 - my;
        ctx.beginPath();
        ctx.arc(mx*CELL_SIZE+CELL_SIZE/2, visualMy*CELL_SIZE+CELL_SIZE/2,12,0,Math.PI*2);
        if(targetPc){
          ctx.fillStyle = "rgba(255,30,30,0.55)";
        }else{
          ctx.fillStyle = "rgba(20,180,40,0.55)";
        }
        ctx.fill();
      }
    }

    const drag = dragRef.current;
    if(drag.active && drag.piece && drag.hoverX!==null && drag.hoverY!==null){
      const mvList = getValidMoves(piecesRef.current,drag.piece,cellType.current);
      const isValid = mvList.some(([mx,my])=>mx===drag.hoverX && my===drag.hoverY);
      if(isValid){
        const targetPc = getPieceAt(piecesRef.current,drag.hoverX,drag.hoverY);
        flashFrameRef.current +=1;
        const visualHoverY = 8 - drag.hoverY;
        if(targetPc && targetPc.side !== drag.piece.side){
          if(Math.sin(flashFrameRef.current*0.2)>0){
            ctx.fillStyle = "rgba(240,40,40,0.45)";
            ctx.fillRect(drag.hoverX*CELL_SIZE, visualHoverY*CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }else{
          ctx.fillStyle = "rgba(40,180,60,0.35)";
          ctx.fillRect(drag.hoverX*CELL_SIZE, visualHoverY*CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    const nameMap:Record<Animal,string> = {
      elephant:"象",lion:"狮",tiger:"虎",leopard:"豹",wolf:"狼",dog:"狗",cat:"猫",mouse:"鼠"
    };
    for(const pc of piecesRef.current){
      ctx.save();
      const visualY = 8 - pc.y;
      const cx = pc.x*CELL_SIZE + CELL_SIZE/2;
      const cy = visualY*CELL_SIZE + CELL_SIZE/2;
      ctx.beginPath();
      ctx.arc(cx,cy,CELL_SIZE*0.38,0,Math.PI*2);
      if(selectedPieceRef.current === pc){
        ctx.strokeStyle="#ffdd00";
        ctx.lineWidth=4;
        ctx.stroke();
      }
      ctx.fillStyle = pc.side === 'red' ? "#ff4444" : "#3366ff";
      ctx.fill();
      ctx.strokeStyle="#222";
      ctx.lineWidth=2;
      ctx.stroke();
      ctx.fillStyle="#fff";
      ctx.font="bold 22px sans-serif";
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillText(nameMap[pc.animal],cx,cy);
      ctx.restore();
    }
  };

  const loop = ()=>{
    draw();
    animRef.current = requestAnimationFrame(loop);
  };

  const getGridPos = (e:MouseEvent):{x:number,y:number}|null=>{
    const canvas = canvasRef.current;
    if(!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = BOARD_WIDTH / rect.width;
    const sy = BOARD_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left)*sx;
    const my = (e.clientY - rect.top)*sy;
    const gx = Math.floor(mx / CELL_SIZE);
    const gyVisual = Math.floor(my / CELL_SIZE);
    // 鼠标点击坐标反向映射回逻辑y
    const gy = 8 - gyVisual;
    if(gx<0||gx>=7||gy<0||gy>=9) return null;
    return {x:gx,y:gy};
  };

  const onMouseDown = (e:MouseEvent)=>{
    if(gameOverRef.current) return;
    if(turnRef.current !== 'red') return;
    const pos = getGridPos(e);
    if(!pos) return;
    const pc = getPieceAt(piecesRef.current,pos.x,pos.y);

    if(pc && pc.side === 'red'){
      selectedPieceRef.current = pc;
      dragRef.current = {active:true,piece:pc,hoverX:pos.x,hoverY:pos.y};
      return;
    }

    if(selectedPieceRef.current){
      const sel = selectedPieceRef.current;
      const validMoves = getValidMoves(piecesRef.current, sel, cellType.current);
      const ok = validMoves.some(([mx,my])=>mx===pos.x && my===pos.y);
      if(ok){
        const target = getPieceAt(piecesRef.current,pos.x,pos.y);
        if(target){
          piecesRef.current = piecesRef.current.filter(p=>p!==target);
        }
        sel.x = pos.x;
        sel.y = pos.y;
        sel.inRiver = cellType.current[pos.y][pos.x] === 'river';
        selectedPieceRef.current = null;

        if(cellType.current[pos.y][pos.x]==='den'){
          gameOverRef.current=true;
          setStatusText("红方获胜！");
          return;
        }
        turnRef.current = 'blue';
        setStatusText("AI思考中...");
        setTimeout(()=>aiMakeMove(),450);
      }else{
        selectedPieceRef.current = null;
      }
    }
  };

  const onMouseMove = (e:MouseEvent)=>{
    if(!dragRef.current.active) return;
    const pos = getGridPos(e);
    if(pos){
      dragRef.current.hoverX = pos.x;
      dragRef.current.hoverY = pos.y;
    }else{
      dragRef.current.hoverX = null;
      dragRef.current.hoverY = null;
    }
  };

  const onMouseUp = ()=>{
    const drag = dragRef.current;
    if(!drag.active || !drag.piece){
      dragRef.current = {active:false,piece:null,hoverX:null,hoverY:null};
      return;
    }
    const piece = drag.piece;
    const hx = drag.hoverX;
    const hy = drag.hoverY;
    if(hx !== null && hy !== null){
      const validMoves = getValidMoves(piecesRef.current,piece,cellType.current);
      const ok = validMoves.some(([mx,my])=>mx===hx && my===hy);
      if(ok){
        const target = getPieceAt(piecesRef.current,hx,hy);
        if(target){
          piecesRef.current = piecesRef.current.filter(p=>p!==target);
        }
        piece.x = hx;
        piece.y = hy;
        piece.inRiver = cellType.current[hy][hx] === 'river';
        selectedPieceRef.current = null;
        if(cellType.current[hy][hx]==='den'){
          gameOverRef.current=true;
          setStatusText("红方获胜！");
          dragRef.current = {active:false,piece:null,hoverX:null,hoverY:null};
          return;
        }
        turnRef.current = 'blue';
        setStatusText("AI思考中...");
        setTimeout(()=>aiMakeMove(),450);
      }
    }
    dragRef.current = {active:false,piece:null,hoverX:null,hoverY:null};
  };

  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    canvas.addEventListener('mousedown',onMouseDown);
    window.addEventListener('mousemove',onMouseMove);
    window.addEventListener('mouseup',onMouseUp);
    animRef.current = requestAnimationFrame(loop);
    return ()=>{
      canvas.removeEventListener('mousedown',onMouseDown);
      window.removeEventListener('mousemove',onMouseMove);
      window.removeEventListener('mouseup',onMouseUp);
      cancelAnimationFrame(animRef.current);
    };
  },[]);

  const resetGame = ()=>{
    piecesRef.current = initPieces();
    turnRef.current = 'red';
    gameOverRef.current = false;
    dragRef.current = {active:false,piece:null,hoverX:null,hoverY:null};
    selectedPieceRef.current = null;
    setStatusText("红方走棋");
  };

  return <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:12}}>
    <h3>斗兽棋｜红方在下，蓝方在上</h3>
    <div style={{marginBottom:8,fontSize:16}}>{statusText}</div>
    <canvas
      ref={canvasRef}
      width={BOARD_WIDTH}
      height={BOARD_HEIGHT}
      style={{width:'420px',border:'2px solid #333'}}
    />
    <button onClick={resetGame} style={{marginTop:10,padding:'6px 16px'}}>重新开局</button>
    <div style={{marginTop:6,fontSize:12,color:'#666'}}>点击棋子显示可行点｜绿色=空位，红色=可吃子；狮虎横跳河，河里有鼠阻挡则不能跳</div>
  </div>;
}
