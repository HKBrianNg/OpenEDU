import type { ReactNode } from 'react';
import { COLORS } from '../constants';

interface PracticeGridProps {
  size: number;
  /** 加上两条斜线就变成米字格 */
  diagonals?: boolean;
  children?: ReactNode;
}

/**
 * 田字格。库自带的渲染器是不画格子的，这层格子自己画：
 * 外框实线、中间十字虚线，和练习本上一致。
 */
export default function PracticeGrid({ size, diagonals = false, children }: PracticeGridProps) {
  const dash = { stroke: COLORS.gridLine, strokeWidth: 0.7, strokeDasharray: '5 4' };

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        background: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ position: 'absolute', inset: 0 }}
        aria-hidden
      >
        <rect
          x={0.5}
          y={0.5}
          width={99}
          height={99}
          fill="none"
          stroke={COLORS.gridBorder}
          strokeWidth={1}
        />
        <line x1={50} y1={0} x2={50} y2={100} {...dash} />
        <line x1={0} y1={50} x2={100} y2={50} {...dash} />
        {diagonals && (
          <>
            <line x1={0} y1={0} x2={100} y2={100} {...dash} />
            <line x1={100} y1={0} x2={0} y2={100} {...dash} />
          </>
        )}
      </svg>

      {children}
    </div>
  );
}
