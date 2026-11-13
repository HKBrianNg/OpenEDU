// 把字帖导出成 PDF。
//
// 为什么整页用 canvas 画而不是让 jsPDF 直接写文字：
// jsPDF 内置字体不含汉字，例词（「頭髮」这类）要么嵌一个好几 MB 的中文字体，
// 要么就变成乱码。canvas 用浏览器自己的字体渲染中文，画完当图片贴进 PDF，
// 例词、拼音都能正常显示，也不用往包里塞字体文件。

import { GLYPH_FLIP_OFFSET, LAYOUTS, MARGIN, PAGE } from './copybook';
import type { CopyBookItem, CopyBookLayout } from './copybook';

/** 200dpi：打印出来够清晰，文件又不至于太大 */
const DPI = 200;
const PX_PER_MM = DPI / 25.4;
const PT = DPI / 72;

const GRAY = '#c8c8c8';
const LINE = '#b5b5b5';
const DASH = '#f0c6c6';

/** 生成并触发下载 */
export async function downloadCopyBookPdf(
  pages: CopyBookItem[][],
  layout: CopyBookLayout,
  title: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PAGE.width * PX_PER_MM);
  canvas.height = Math.round(PAGE.height * PX_PER_MM);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('拿不到 canvas 上下文');

  for (let i = 0; i < pages.length; i += 1) {
    drawPage(ctx, pages[i], layout, i, pages.length);
    if (i > 0) doc.addPage();
    doc.addImage(
      canvas.toDataURL('image/jpeg', 0.9),
      'JPEG',
      0,
      0,
      PAGE.width,
      PAGE.height,
      undefined,
      'FAST',
    );
  }

  doc.save(`${title}.pdf`);
}

/** 把一页画到 canvas 上，坐标都用 mm，画的时候乘 PX_PER_MM */
function drawPage(
  ctx: CanvasRenderingContext2D,
  items: CopyBookItem[],
  layout: CopyBookLayout,
  pageIndex: number,
  pageCount: number,
): void {
  const mm = (v: number) => v * PX_PER_MM;
  const ox = mm(MARGIN);
  const oy = mm(MARGIN);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, mm(PAGE.width), mm(PAGE.height));
  ctx.textBaseline = 'alphabetic';

  if (layout === 'row') {
    const spec = LAYOUTS.row;
    const gap = 3;
    const block = spec.label + spec.cell + gap;

    items.forEach((item, i) => {
      const top = oy + mm(i * block);

      ctx.fillStyle = '#777';
      ctx.font = `${9 * PT}px sans-serif`;
      ctx.fillText(item.pinyin, ox, top + mm(spec.label) - mm(1.2));
      ctx.fillStyle = '#aaa';
      ctx.fillText(item.word, ox + mm(14), top + mm(spec.label) - mm(1.2));

      const rowTop = top + mm(spec.label);
      for (let k = 0; k < spec.cols; k += 1) {
        const left = ox + mm(k * spec.cell);
        drawCell(ctx, left, rowTop, mm(spec.cell));
        if (k === 0) drawGlyph(ctx, item, left, rowTop, mm(spec.cell));
      }
    });
  } else {
    const spec = LAYOUTS.grid;
    const labelH = 5;
    const wordH = 6;
    const inner = spec.cell - labelH - wordH;

    items.forEach((item, i) => {
      const col = i % spec.cols;
      const row = Math.floor(i / spec.cols);
      const boxX = ox + mm(col * spec.cell);
      const boxY = oy + mm(row * spec.cell);
      const cellPx = mm(inner);
      const cellX = boxX + (mm(spec.cell) - cellPx) / 2;
      const cellY = boxY + mm(labelH);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#777';
      ctx.font = `${7 * PT}px sans-serif`;
      ctx.fillText(item.pinyin, boxX + mm(spec.cell) / 2, boxY + mm(4));

      drawCell(ctx, cellX, cellY, cellPx);
      drawGlyph(ctx, item, cellX, cellY, cellPx);

      ctx.fillStyle = '#aaa';
      ctx.font = `${6.5 * PT}px sans-serif`;
      ctx.fillText(item.word, boxX + mm(spec.cell) / 2, boxY + mm(spec.cell) - mm(1.6));
      ctx.textAlign = 'left';
    });
  }

  // 页码
  ctx.fillStyle = '#aaa';
  ctx.font = `${9 * PT}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `${pageIndex + 1} / ${pageCount}`,
    mm(PAGE.width) / 2,
    mm(PAGE.height - 7),
  );
  ctx.textAlign = 'left';
}

/** 田字格：外框 + 十字虚线 */
function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = Math.max(1, PX_PER_MM * 0.26);
  ctx.strokeRect(x, y, size, size);

  ctx.save();
  ctx.setLineDash([PX_PER_MM * 1.2, PX_PER_MM * 1.2]);
  ctx.strokeStyle = DASH;
  ctx.beginPath();
  ctx.moveTo(x + size / 2, y);
  ctx.lineTo(x + size / 2, y + size);
  ctx.moveTo(x, y + size / 2);
  ctx.lineTo(x + size, y + size / 2);
  ctx.stroke();
  ctx.restore();
}

/** 范字：笔画是 1024×1024 坐标系下的闭合轮廓，缩放后填色 */
function drawGlyph(
  ctx: CanvasRenderingContext2D,
  item: CopyBookItem,
  x: number,
  y: number,
  size: number,
): void {
  const inner = size * 0.86;
  const off = (size - inner) / 2;
  const scale = inner / 1024;

  ctx.save();
  ctx.translate(x + off, y + off);
  ctx.scale(scale, scale);
  // 数据的 y 轴朝上，翻下来才是正常方向（跟屏幕上的 SVG 同一个变换）
  ctx.translate(0, GLYPH_FLIP_OFFSET);
  ctx.scale(1, -1);
  ctx.fillStyle = GRAY;
  for (const d of item.glyph.strokes) {
    ctx.fill(new Path2D(d));
  }
  ctx.restore();
}
