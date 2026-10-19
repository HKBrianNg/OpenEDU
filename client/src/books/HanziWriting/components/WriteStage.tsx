import { useEffect, useRef, useState } from 'react';
import { Button, Space, Typography } from 'antd';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useHanziWriter } from '../hooks/useHanziWriter';
import PracticeGrid from './PracticeGrid';
import { charOf, COLORS } from '../constants';
import type { HanziChar, ScriptMode } from '../types';
import { useLocale } from '../../../store/LocaleContext';

const { Text } = Typography;

interface WriteStageProps {
  entry: HanziChar;
  script: ScriptMode;
  size: number;
  resetKey: number;
  onReset: () => void;
}

/**
 * 默写：一个干干净净的空格子，用鼠标（或手指）直接在上面写。
 * 写完可以点「对照范字」把正确的字叠上来比较，不打分也不判对错。
 */
export default function WriteStage({
  entry,
  script,
  size,
  resetKey,
  onReset,
}: WriteStageProps) {
  const { t } = useLocale();
  const char = charOf(entry, script);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // 范字层：点「对照」时淡入叠在自己写的字下面
  const { containerRef } = useHanziWriter({
    char,
    grade: entry.grade,
    script,
    size,
    showOutline: false,
    showCharacter: true,
    strokeAnimationSpeed: 1,
    resetKey,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // 之后都用 CSS 像素坐标作画，缩放交给 transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COLORS.pen;
    ctx.fillStyle = COLORS.pen;
  }, [char, size, resetKey]);

  const ctxOf = () => canvasRef.current?.getContext('2d') ?? null;

  const pointOf = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handleDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = ctxOf();
    if (!ctx) return;
    drawingRef.current = true;
    const point = pointOf(event);
    lastPointRef.current = point;
    // 只点一下不拖，也要留下一个圆点，不然像是没写上去
    ctx.beginPath();
    ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = ctxOf();
    const last = lastPointRef.current;
    if (!ctx || !last) return;
    const point = pointOf(event);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const handleUp = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const clear = () => {
    ctxOf()?.clearRect(0, 0, size, size);
  };

  return (
    <div>
      <PracticeGrid size={size}>
        {/* 范字在下，笔迹在上 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: showAnswer ? 0.35 : 0,
            transition: 'opacity 200ms',
            pointerEvents: 'none',
          }}
        >
          <div ref={containerRef} style={{ width: size, height: size }} />
        </div>
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: size,
            height: size,
            // 手指头在上面写的时候别让页面跟着滚
            touchAction: 'none',
            cursor: 'crosshair',
          }}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
        />
      </PracticeGrid>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Space wrap>
          <Button onClick={clear}>{t('hanziwriting.clear')}</Button>
          <Button type="primary" onClick={() => setShowAnswer((v) => !v)}>
            {showAnswer ? t('hanziwriting.hideAnswer') : t('hanziwriting.showAnswer')}
          </Button>
          <Button onClick={onReset}>{t('hanziwriting.reset')}</Button>
        </Space>
        <Text type="secondary">{t('hanziwriting.writeHint')}</Text>
      </div>
    </div>
  );
}
