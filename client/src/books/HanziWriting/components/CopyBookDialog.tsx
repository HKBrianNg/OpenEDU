import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Segmented, Spin, App } from 'antd';
import '../copybook.css';
import CopyBookPage from './CopyBookPage';
import { loadCopyBookItems, paginate } from '../utils/copybook';
import type { CopyBookItem, CopyBookLayout } from '../utils/copybook';
import { downloadCopyBookPdf } from '../utils/copybookPdf';
import { useLocale } from '../../../store/LocaleContext';
import type { HanziChar, ScriptMode } from '../types';

interface CopyBookDialogProps {
  entries: HanziChar[];
  script: ScriptMode;
  onClose: () => void;
}

/**
 * 字帖弹窗。屏幕上显示 A4 预览，打印 / 下载 PDF 走真实尺寸。
 *
 * 自己写 fixed 层而不是用 antd Modal，是因为打印时要让整个 body 只显示字帖页，
 * antd Modal 的 portal 容器不好用 CSS 选中；自己挂的 div 是 body 的直接子元素，
 * 一行 `body > *:not(.copybook-root)` 就能把别的东西都藏起来。
 */
export default function CopyBookDialog({ entries, script, onClose }: CopyBookDialogProps) {
  const { t } = useLocale();
  const { message } = App.useApp();
  const [layout, setLayout] = useState<CopyBookLayout>('row');
  const [items, setItems] = useState<CopyBookItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    loadCopyBookItems(entries, script)
      .then((got) => {
        if (alive) setItems(got);
      })
      .catch((e: unknown) => {
        if (alive) setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [entries, script]);

  const pages = useMemo(() => (items ? paginate(items, layout) : []), [items, layout]);

  const onDownload = async () => {
    if (!items) return;
    setDownloading(true);
    try {
      await downloadCopyBookPdf(pages, layout, filename(script));
      void message.success(t('hanziwriting.copyBook.downloaded'));
    } catch (e) {
      void message.error(t('hanziwriting.copyBook.downloadFailed'));
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const onPrint = () => window.print();

  // 挂到 body 下，打印 CSS 才能用 body > *:not(...) 把页面其他部分整体藏掉
  return createPortal(
    <div className="copybook-root" role="dialog" aria-label="copy book">
      <div className="copybook-backdrop" onClick={onClose} />
      <div className="copybook-panel">
        <div className="copybook-toolbar">
          <Segmented
            value={layout}
            onChange={(v) => setLayout(v as CopyBookLayout)}
            options={[
              { label: t('hanziwriting.copyBook.layoutRow'), value: 'row' },
              { label: t('hanziwriting.copyBook.layoutGrid'), value: 'grid' },
            ]}
          />
          <span className="copybook-stat">
            {items ? `${items.length} ${t('hanziwriting.copyBook.chars')}` : '…'} ·{' '}
            {pages.length} {t('hanziwriting.copyBook.pages')}
          </span>
          <div style={{ flex: 1 }} />
          <Button onClick={onPrint} disabled={!items}>
            🖨 {t('hanziwriting.copyBook.print')}
          </Button>
          <Button
            type="primary"
            onClick={onDownload}
            disabled={!items || downloading}
            loading={downloading}
          >
            ⬇ {t('hanziwriting.copyBook.download')}
          </Button>
          <Button onClick={onClose}>✕</Button>
        </div>

        {loadError ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#c00' }}>{loadError}</div>
        ) : !items ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin tip={t('hanziwriting.loadingStrokes')} />
          </div>
        ) : (
          <div className="copybook-scroll">
            {pages.map((page, i) => (
              <div key={i} className="copybook-page-wrap">
                <CopyBookPage
                  items={page}
                  layout={layout}
                  pageIndex={i}
                  pageCount={pages.length}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function filename(script: ScriptMode): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  return script === 'traditional' ? `hanzi-copybook-traditional-${ymd}` : `hanzi-copybook-${ymd}`;
}
