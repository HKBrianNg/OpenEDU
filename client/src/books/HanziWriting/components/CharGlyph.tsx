import type { CharStrokes } from '../types';
import { GLYPH_FLIP_OFFSET } from '../utils/copybook';

interface CharGlyphProps {
  glyph: CharStrokes;
  /** 范字颜色，默认浅灰，描红就叠着它写 */
  color?: string;
  /** 相对格子的占比，留一点内边距看着不挤 */
  scale?: number;
}

/**
 * 把一个字画成 SVG。笔画数据是 1024×1024 坐标系下的闭合轮廓，
 * 每条 path 填色就是一笔，直接用 <path> 画，打印出来是矢量，放大不糊。
 */
export default function CharGlyph({ glyph, color = '#c8c8c8', scale = 0.86 }: CharGlyphProps) {
  const pad = ((1 - scale) / 2) * 1024;
  return (
    <svg
      viewBox="0 0 1024 1024"
      width="100%"
      height="100%"
      style={{ display: 'block', position: 'absolute', inset: 0 }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* 变换从右往左作用在点上：先把 y 翻下来，再缩到格子里，最后居中留白 */}
      <g
        transform={`translate(${pad} ${pad}) scale(${scale}) translate(0 ${GLYPH_FLIP_OFFSET}) scale(1 -1)`}
      >
        {glyph.strokes.map((d, i) => (
          <path key={i} d={d} fill={color} />
        ))}
      </g>
    </svg>
  );
}
