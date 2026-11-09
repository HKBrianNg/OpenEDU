import CharGlyph from './CharGlyph';
import { CONTENT, LAYOUTS, MARGIN, PAGE } from '../utils/copybook';
import type { CopyBookItem, CopyBookLayout } from '../utils/copybook';

interface CopyBookPageProps {
  items: CopyBookItem[];
  layout: CopyBookLayout;
  pageIndex: number;
  pageCount: number;
}

/**
 * 一页 A4 字帖。尺寸直接用 mm，屏幕上是 96dpi 下的像素值，
 * 打印时浏览器按物理尺寸还原，格子大小跟预览一致。
 *
 * 边框只画右边和下边，整块区域补上边和左边，相邻格子共用一条线，不会变成 2px。
 */
export default function CopyBookPage({
  items,
  layout,
  pageIndex,
  pageCount,
}: CopyBookPageProps) {
  return (
    <div
      className="copybook-page"
      style={{
        width: `${PAGE.width}mm`,
        height: `${PAGE.height}mm`,
        position: 'relative',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${MARGIN}mm`,
          top: `${MARGIN}mm`,
          width: `${CONTENT.width}mm`,
          height: `${CONTENT.height}mm`,
        }}
      >
        {layout === 'row' ? <RowLayout items={items} /> : <GridLayout items={items} />}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '7mm',
          left: 0,
          width: '100%',
          textAlign: 'center',
          fontSize: '9pt',
          color: '#aaa',
        }}
      >
        {pageIndex + 1} / {pageCount}
      </div>
    </div>
  );
}

/** 每字一行：范字在最左，右边一串空格照着写 */
function RowLayout({ items }: { items: CopyBookItem[] }) {
  const spec = LAYOUTS.row;
  const gap = 3;
  const block = spec.label + spec.cell + gap;

  return (
    <>
      {items.map((item, i) => (
        <div
          key={`${item.char}-${i}`}
          style={{ position: 'absolute', left: 0, top: `${i * block}mm`, width: '100%' }}
        >
          <div
            style={{
              height: `${spec.label}mm`,
              display: 'flex',
              alignItems: 'flex-end',
              gap: '3mm',
              paddingBottom: '1mm',
              fontSize: '9pt',
              color: '#777',
            }}
          >
            <span>{item.pinyin}</span>
            <span style={{ color: '#aaa' }}>{item.word}</span>
          </div>
          <div
            style={{
              display: 'flex',
              height: `${spec.cell}mm`,
              borderTop: '1px solid #b5b5b5',
              borderLeft: '1px solid #b5b5b5',
            }}
          >
            <Cell size={spec.cell}>
              <CharGlyph glyph={item.glyph} />
            </Cell>
            {Array.from({ length: spec.blanks }, (_, k) => (
              <Cell key={k} size={spec.cell} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** 网格铺满：一格一个字，格子上标拼音、下面标例词 */
function GridLayout({ items }: { items: CopyBookItem[] }) {
  const spec = LAYOUTS.grid;
  const cols = spec.cols;
  const labelH = 5;
  const wordH = 6;
  const cellH = spec.cell - labelH - wordH;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${spec.cell}mm)`,
        borderTop: '1px solid #b5b5b5',
        borderLeft: '1px solid #b5b5b5',
      }}
    >
      {items.map((item, i) => (
        <div
          key={`${item.char}-${i}`}
          style={{
            width: `${spec.cell}mm`,
            height: `${spec.cell}mm`,
            borderRight: '1px solid #b5b5b5',
            borderBottom: '1px solid #b5b5b5',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              height: `${labelH}mm`,
              lineHeight: `${labelH}mm`,
              fontSize: '7pt',
              color: '#777',
              whiteSpace: 'nowrap',
            }}
          >
            {item.pinyin}
          </div>
          <div style={{ width: `${cellH}mm`, height: `${cellH}mm`, position: 'relative' }}>
            <InnerBox>
              <CharGlyph glyph={item.glyph} />
            </InnerBox>
          </div>
          <div
            style={{
              height: `${wordH}mm`,
              lineHeight: `${wordH}mm`,
              fontSize: '6.5pt',
              color: '#aaa',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {item.word}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 田字格：外框 + 十字虚线 */
function Cell({ size, children }: { size: number; children?: React.ReactNode }) {
  return (
    <div
      style={{
        width: `${size}mm`,
        height: `${size}mm`,
        position: 'relative',
        boxSizing: 'border-box',
        borderRight: '1px solid #b5b5b5',
        borderBottom: '1px solid #b5b5b5',
        flex: '0 0 auto',
      }}
    >
      <CrossLines />
      {children}
    </div>
  );
}

function InnerBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        border: '1px solid #b5b5b5',
        boxSizing: 'border-box',
      }}
    >
      <CrossLines />
      {children}
    </div>
  );
}

function CrossLines() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          borderLeft: '1px dashed #f0c6c6',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          borderTop: '1px dashed #f0c6c6',
        }}
      />
    </>
  );
}
