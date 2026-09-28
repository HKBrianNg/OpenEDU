import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PuzzleGame.css';

interface PuzzlePiece {
  id: number;
  src: string;
  correctPosition: number; 
}

const LAYOUTS = [
  { label: '1x1', rows: 1, cols: 1 },
  { label: '1x2', rows: 1, cols: 2 },
  { label: '2x2', rows: 2, cols: 2 },
  { label: '3x3', rows: 3, cols: 3 },
  { label: '4x4', rows: 4, cols: 4 },
];

const PuzzleGame: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [layoutIndex, setLayoutIndex] = useState(0);
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'won'>('idle');
  const [timer, setTimer] = useState(0);
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number | null>(null);
  
  const timerRef = useRef<number | null>(null);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 切割图片的核心逻辑
  const sliceImage = useCallback((src: string, rows: number, cols: number) => {
    return new Promise<PuzzlePiece[]>((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const pieceWidth = img.width / cols;
        const pieceHeight = img.height / rows;
        const newPieces: PuzzlePiece[] = [];

        for (let i = 0; i < rows * cols; i++) {
          const row = Math.floor(i / cols);
          const col = i % cols;

          const canvas = document.createElement('canvas');
          canvas.width = pieceWidth;
          canvas.height = pieceHeight;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, col * pieceWidth, row * pieceHeight, pieceWidth, pieceHeight, 0, 0, pieceWidth, pieceHeight);
          }

          newPieces.push({
            id: i,
            src: canvas.toDataURL(),
            correctPosition: i,
          });
        }
        resolve(newPieces);
      };
    });
  }, []);

  // 打乱数组
  const shuffleArray = (array: PuzzlePiece[]): PuzzlePiece[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // 确保打乱后的顺序不是完全正确的
    const isSolved = arr.every((p, index) => p.correctPosition === index);
    if (isSolved && arr.length > 1) {
      return shuffleArray(arr);
    }
    return arr;
  };

  // 检查是否获胜
  useEffect(() => {
    if (gameState !== 'playing' || pieces.length === 0) return;
    const isSolved = pieces.every((p, index) => p.correctPosition === index);
    if (isSolved) {
      setGameState('won');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [pieces, gameState]);

  // 处理上传图片
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const result = evt.target?.result as string;
        setImageSrc(result);
        setGameState('idle');
        setTimer(0);
        if (timerRef.current) clearInterval(timerRef.current);
        setSelectedPieceIndex(null);

        const layout = LAYOUTS[layoutIndex];
        const sliced = await sliceImage(result, layout.rows, layout.cols);
        setPieces(sliced);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // 点击开始游戏
  const handleStartGame = async () => {
    if (!imageSrc) return;
    const layout = LAYOUTS[layoutIndex];
    const sliced = await sliceImage(imageSrc, layout.rows, layout.cols);
    const shuffled = shuffleArray(sliced);
    
    setPieces(shuffled);
    setGameState('playing');
    setTimer(0);
    setSelectedPieceIndex(null);
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = window.setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  };

  // 暂停游戏
  const handlePauseGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('paused');
  };

  // 继续游戏
  const handleResumeGame = () => {
    setGameState('playing');
    timerRef.current = window.setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  };

  // 返回大厅（重置所有）
  const handleReset = () => {
    setImageSrc(null);
    setPieces([]);
    setGameState('idle');
    setTimer(0);
    setSelectedPieceIndex(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // 切换难度（仅在游戏未开始或已暂停/结束时有效）
  const handleLayoutChange = (index: number) => {
    setLayoutIndex(index);
    setSelectedPieceIndex(null);
    // 如果已经上传了图片，重新切片显示原图
    if (imageSrc && gameState !== 'playing') {
      const layout = LAYOUTS[index];
      sliceImage(imageSrc, layout.rows, layout.cols).then(sliced => {
        setPieces(sliced);
      });
    }
  };

  // 点击交换逻辑（替代拖拽）
  const handlePieceClick = (clickIndex: number) => {
    if (gameState !== 'playing') return;

    if (selectedPieceIndex === null) {
      setSelectedPieceIndex(clickIndex);
    } else {
      if (selectedPieceIndex === clickIndex) {
        setSelectedPieceIndex(null);
      } else {
        // 交换两块拼图
        const newPieces = [...pieces];
        const temp = newPieces[clickIndex];
        newPieces[clickIndex] = newPieces[selectedPieceIndex];
        newPieces[selectedPieceIndex] = temp;
        
        setPieces(newPieces);
        setSelectedPieceIndex(null);
      }
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const currentLayout = LAYOUTS[layoutIndex];
  const gridStyle = {
    gridTemplateColumns: `repeat(${currentLayout.cols}, 1fr)`,
    gridTemplateRows: `repeat(${currentLayout.rows}, 1fr)`,
  };

  return (
    <div className="puzzle-container">
      {/* 顶部控制栏 */}
      <div className="controls">
        <select 
          value={layoutIndex} 
          onChange={(e) => handleLayoutChange(Number(e.target.value))}
          disabled={gameState === 'playing'}
        >
          {LAYOUTS.map((layout, idx) => (
            <option key={layout.label} value={idx}>{layout.label}</option>
          ))}
        </select>

        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          id="file-upload"
          disabled={gameState === 'playing'}
        />
        <label htmlFor="file-upload" className="file-btn">上传图片</label>

        {gameState === 'idle' && imageSrc && (
          <button className="primary-btn" onClick={handleStartGame}>开始游戏</button>
        )}
        {gameState === 'playing' && (
          <button className="pause-btn" onClick={handlePauseGame}>暂停</button>
        )}
        {gameState === 'paused' && (
          <button className="primary-btn" onClick={handleResumeGame}>继续</button>
        )}
        {gameState === 'won' && (
          <div className="win-message">恭喜你拼好了！</div>
        )}
        {imageSrc && (
          <button className="back-btn" onClick={handleReset}>返回大厅</button>
        )}
      </div>

      {/* 计时器 */}
      {gameState !== 'idle' && (
        <div className="timer">⏱️ {formatTime(timer)}</div>
      )}

      {/* 拼图区域 */}
      {imageSrc && (
        <div className="grid" style={gridStyle}>
          {pieces.map((piece, index) => (
            <div 
              key={piece.id} 
              className={`puzzle-piece ${selectedPieceIndex === index ? 'selected' : ''}`}
              style={{ backgroundImage: `url(${piece.src})` }}
              onClick={() => handlePieceClick(index)}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PuzzleGame;