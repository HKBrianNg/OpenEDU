// desktop/src/pages/admin/DataAdmin/index.tsx
//
// 数据仓库 / CDN 镜像对照管理。重写自 img-library/openEDU/admin/main.py（PySide6 CDN Manager）。
// 左：本地目录树（懒加载，1GB 仓库不全量扫描）；中：本地资讯 + 预览；
// 右：CDN 镜像资讯 + 预览。文本文件会额外做「本地 ↔ 远端」内容比对，
// 用于确认 push 到 img-library 后 jsDelivr 是否已同步。

import { Fragment, useCallback, useMemo, useState } from 'react';
import type { CSSProperties, Key, ReactNode } from 'react';
import { App, Button, Empty, Select, Space, Tag, Tree, Typography } from 'antd';
import type { TreeDataNode } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import type { DataEntry, IpcResult, ProbeResult, TextResult } from './dataTypes';

const { Text } = Typography;

const CDN_OPTIONS = [
  { label: 'gcore.jsdelivr.net', value: 'https://gcore.jsdelivr.net/gh/HKBrianNg/img-library@main' },
  { label: 'fastly.jsdelivr.net', value: 'https://fastly.jsdelivr.net/gh/HKBrianNg/img-library@main' },
  { label: 'cdn.jsdelivr.net', value: 'https://cdn.jsdelivr.net/gh/HKBrianNg/img-library@main' },
];

const TEXT_EXTS = new Set(['lrc', 'txt', 'json', 'md', 'csv', 'xml', 'html', 'htm', 'log', 'js', 'css']);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogv', 'mov']);

type DataTreeNode = TreeDataNode & { entry?: DataEntry };

async function invoke<T>(channel: string, ...args: unknown[]): Promise<IpcResult<T> | undefined> {
  if (!window.ipcRenderer) return undefined;
  return (await window.ipcRenderer.invoke(channel, ...args)) as IpcResult<T>;
}

function encodeRel(rel: string): string {
  return rel.split('/').map(encodeURIComponent).join('/');
}

function formatBytes(n: number): string {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function iconFor(ext: string, isDir: boolean): ReactNode {
  if (isDir) return '📁';
  if (IMAGE_EXTS.has(ext)) return '🖼️';
  if (AUDIO_EXTS.has(ext)) return '🎵';
  if (VIDEO_EXTS.has(ext)) return '🎬';
  if (TEXT_EXTS.has(ext)) return '📋';
  return '📄';
}

function makeRoot(): DataTreeNode {
  return { key: '.', title: 'openEDU', isLeaf: false, icon: '📁' };
}

function updateTreeData(
  list: DataTreeNode[],
  key: Key,
  children: DataTreeNode[],
): DataTreeNode[] {
  return list.map((node) => {
    if (node.key === key) return { ...node, children, isLeaf: children.length === 0 };
    if (node.children) {
      return { ...node, children: updateTreeData(node.children as DataTreeNode[], key, children) };
    }
    return node;
  });
}

function InfoRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr', gap: '4px 8px', fontSize: 12 }}>
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <Text type="secondary">{label}</Text>
          <span style={{ wordBreak: 'break-all' }}>{value}</span>
        </Fragment>
      ))}
    </div>
  );
}

/** 按扩展名选择预览方式：文本 / 图片 / 音频 / 视频 */
function Preview({
  url,
  ext,
  text,
  noPreview,
}: {
  url: string;
  ext: string;
  text?: string;
  noPreview: string;
}) {
  if (TEXT_EXTS.has(ext)) {
    return (
      <pre
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'Consolas, monospace',
          fontSize: 12,
          color: 'inherit',
        }}
      >
        {text ?? ''}
      </pre>
    );
  }
  if (IMAGE_EXTS.has(ext)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', height: '100%' }}>
        <img src={url} alt={url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
    );
  }
  if (AUDIO_EXTS.has(ext)) {
    return <audio controls src={url} style={{ width: '100%' }} />;
  }
  if (VIDEO_EXTS.has(ext)) {
    return <video controls src={url} style={{ width: '100%', maxHeight: '100%' }} />;
  }
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={noPreview} />;
}

const boxStyle: CSSProperties = {
  border: '1px solid rgba(128,128,128,.22)',
  borderRadius: 6,
  padding: 8,
  background: 'rgba(127,127,127,.05)',
};

export function DataAdmin() {
  const { t } = useLocale();
  const { message } = App.useApp();

  const [cdnBase, setCdnBase] = useState(CDN_OPTIONS[0].value);
  const [treeData, setTreeData] = useState<DataTreeNode[]>([makeRoot()]);
  const [treeKey, setTreeKey] = useState(0);
  const [selected, setSelected] = useState<DataEntry | null>(null);

  const [localText, setLocalText] = useState<TextResult | null>(null);
  const [cdnText, setCdnText] = useState<TextResult | null>(null);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);
  const [purging, setPurging] = useState(false);
  const [status, setStatus] = useState(() => t('Data.waitFile'));

  const cdnUrl = useMemo(
    () => (selected && !selected.isDir ? `${cdnBase}/openEDU/${encodeRel(selected.key)}` : ''),
    [cdnBase, selected],
  );
  const localUrl = useMemo(
    () =>
      selected && !selected.isDir
        ? `${window.desktopApi?.apiBase || ''}/data/${encodeRel(selected.key)}`
        : '',
    [selected],
  );

  // ─── 目录树：展开时才扫描一层 ───
  const loadData = useCallback(
    async (node: DataTreeNode) => {
      const res = await invoke<DataEntry[]>('data:list-dir', String(node.key));
      if (!res?.ok || !res.data) {
        message.error(`${t('Data.loadFailed')}: ${res?.error || ''}`);
        return;
      }
      const children: DataTreeNode[] = res.data.map((e) => ({
        key: e.key,
        title: e.title,
        isLeaf: !e.isDir,
        icon: iconFor(e.ext, e.isDir),
        entry: e,
      }));
      setTreeData((prev) => updateTreeData(prev, node.key as Key, children));
    },
    [message, t],
  );

  // ─── 选中：清掉上一次的探测结果，文本文件顺手读取本地内容 ───
  const onSelectNode = useCallback(
    async (node: DataTreeNode) => {
      setProbe(null);
      setCdnText(null);
      setLocalText(null);
      const entry = node.entry;
      if (!entry) {
        setSelected(null);
        setStatus(t('Data.selectedFolder'));
        return;
      }
      setSelected(entry);
      if (entry.isDir) {
        setStatus(`${t('Data.selectedFolder')} (${entry.title})`);
        return;
      }
      setStatus(`${t('Data.selectedFile')} (${entry.title})`);
      if (TEXT_EXTS.has(entry.ext)) {
        const res = await invoke<TextResult>('data:read-text', entry.key);
        if (res?.ok && res.data) setLocalText(res.data);
        else message.error(`${t('Data.readFailed')}: ${res?.error || ''}`);
      }
    },
    [message, t],
  );

  const resetProbe = useCallback(() => {
    setProbe(null);
    setCdnText(null);
    setStatus(t('Data.waitProbe'));
  }, [t]);

  const handleCdnChange = useCallback(
    (value: string) => {
      setCdnBase(value);
      if (cdnUrl) resetProbe();
    },
    [cdnUrl, resetProbe],
  );

  const handleProbe = useCallback(async () => {
    if (!cdnUrl || !selected) return;
    setProbing(true);
    setProbe(null);
    setCdnText(null);
    setStatus(t('Data.probing'));
    try {
      const res = await invoke<ProbeResult>('data:probe-cdn', cdnUrl);
      if (!res?.ok || !res.data) {
        setStatus(`${t('Data.probeFail')}: ${res?.error || ''}`);
        return;
      }
      const result = res.data;
      setProbe(result);
      setStatus(
        result.ok
          ? `${t('Data.probeOk')} (HTTP ${result.status}, ${result.bytes ? formatBytes(result.bytes) : '?'}, ${result.ms}ms)`
          : `${t('Data.probeFail')} (${result.message})`,
      );
      // 文本文件：抓远端内容用于比对
      if (result.ok && TEXT_EXTS.has(selected.ext)) {
        const tr = await invoke<TextResult>('data:fetch-cdn-text', cdnUrl);
        if (tr?.ok && tr.data) setCdnText(tr.data);
      }
    } finally {
      setProbing(false);
    }
  }, [cdnUrl, selected, t]);

  const handlePurge = useCallback(async () => {
    if (!selected || !cdnUrl) return;
    setPurging(true);
    try {
      const res = await invoke<{ status: number; url: string }>(
        'data:purge-cdn',
        selected.key,
        cdnBase,
      );
      if (res?.ok) {
        message.success(`${t('Data.purgeOk')} (HTTP ${res.data?.status})`);
        setStatus(t('Data.purgeOk'));
      } else {
        message.error(`${t('Data.purgeFail')} (HTTP ${res?.status || 0})`);
        setStatus(t('Data.purgeFail'));
      }
    } finally {
      setPurging(false);
    }
  }, [selected, cdnUrl, cdnBase, message, t]);

  const handleOpen = useCallback(async () => {
    if (!cdnUrl) return;
    await invoke<null>('data:open-external', cdnUrl);
  }, [cdnUrl]);

  const handleCopy = useCallback(async () => {
    if (!cdnUrl) return;
    try {
      await navigator.clipboard.writeText(cdnUrl);
      message.success(t('Data.copied'));
    } catch {
      message.error(cdnUrl);
    }
  }, [cdnUrl, message, t]);

  const refreshTree = useCallback(() => {
    setTreeData([makeRoot()]);
    setTreeKey((k) => k + 1);
    setSelected(null);
    setLocalText(null);
    setCdnText(null);
    setProbe(null);
    setStatus(t('Data.waitFile'));
  }, [t]);

  // ─── 本地 ↔ CDN 文本比对 ───
  // 本地仓库多为 CRLF，GitHub/CDN 上是 LF；归一化换行后再比，
  // 否则每个文件都会因换行符差异被误报为「不一致」。
  const compare = useMemo<'same' | 'diff' | 'truncated' | null>(() => {
    if (!localText || !cdnText) return null;
    if (localText.truncated || cdnText.truncated) return 'truncated';
    const normalize = (s: string) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return normalize(localText.text) === normalize(cdnText.text) ? 'same' : 'diff';
  }, [localText, cdnText]);

  const localInfo =
    selected && !selected.isDir ? (
      <InfoRows
        rows={[
          [t('Data.name'), selected.title],
          [t('Data.type'), selected.ext || '—'],
          [t('Data.path'), selected.key],
          [t('Data.size'), formatBytes(selected.size)],
          [t('Data.modified'), new Date(selected.mtime).toLocaleString()],
        ]}
      />
    ) : (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={selected?.isDir ? t('Data.folderHint') : t('Data.waitFile')}
      />
    );

  const cdnInfo =
    selected && !selected.isDir ? (
      <InfoRows
        rows={[
          [t('Data.url'), <Text style={{ fontSize: 12, wordBreak: 'break-all' }}>{cdnUrl}</Text>],
          [
            t('Data.status'),
            probe ? (
              <Tag color={probe.ok ? 'green' : 'red'}>
                {probe.ok ? t('Data.probeOk') : t('Data.probeFail')}
              </Tag>
            ) : (
              <Text type="secondary">{t('Data.waitProbe')}</Text>
            ),
          ],
          [t('Data.http'), probe ? String(probe.status) : '—'],
          [t('Data.verifiedBytes'), probe?.ok ? formatBytes(probe.bytes) : '—'],
          [t('Data.elapsed'), probe ? `${probe.ms} ms` : '—'],
        ]}
      />
    ) : (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Data.waitFile')} />
    );

  let localPreview: ReactNode = (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Data.waitFile')} />
  );
  if (selected?.isDir) {
    localPreview = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Data.folderHint')} />;
  } else if (selected && localUrl) {
    localPreview = (
      <Preview
        url={localUrl}
        ext={selected.ext}
        text={localText?.text}
        noPreview={t('Data.noPreview')}
      />
    );
  }

  let cdnPreview: ReactNode = (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Data.waitFile')} />
  );
  if (selected?.isDir) {
    cdnPreview = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Data.folderHint')} />;
  } else if (selected && !probe) {
    cdnPreview = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Data.waitProbe')} />;
  } else if (selected && probe && !probe.ok) {
    cdnPreview = (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={`${t('Data.probeFail')}: ${probe.message}`}
      />
    );
  } else if (selected && probe?.ok) {
    cdnPreview = (
      <Preview url={cdnUrl} ext={selected.ext} text={cdnText?.text} noPreview={t('Data.noPreview')} />
    );
  }

  const colStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        padding: 12,
        gap: 10,
        boxSizing: 'border-box',
      }}
    >
      {/* 工具栏 */}
      <Space wrap size="small" style={{ flexShrink: 0 }}>
        <Text strong>{t('Data.cdn')}:</Text>
        <Select value={cdnBase} options={CDN_OPTIONS} onChange={handleCdnChange} style={{ width: 220 }} />
        <Button type="primary" loading={probing} disabled={!cdnUrl} onClick={handleProbe}>
          🔍 {t('Data.probe')}
        </Button>
        <Button loading={purging} disabled={!cdnUrl || !probe?.ok} onClick={handlePurge}>
          🗑 {t('Data.purge')}
        </Button>
        <Button disabled={!cdnUrl} onClick={handleOpen}>
          🌐 {t('Data.openBrowser')}
        </Button>
        <Button disabled={!cdnUrl} onClick={handleCopy}>
          📋 {t('Data.copyUrl')}
        </Button>
        <Button onClick={refreshTree}>🔄 {t('Data.refresh')}</Button>
        <Tag color={probing ? 'processing' : probe?.ok ? 'success' : probe ? 'error' : 'default'}>
          {status}
        </Tag>
      </Space>

      {/* 三栏 */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12 }}>
        {/* 左：本地目录树 */}
        <div
          className="custom-scroll"
          style={{
            width: 260,
            flexShrink: 0,
            overflow: 'auto',
            borderRight: '1px solid rgba(128,128,128,.22)',
            paddingRight: 8,
          }}
        >
          <Text strong>📁 {t('Data.localTree')}</Text>
          <Tree
            key={treeKey}
            blockNode
            treeData={treeData}
            loadData={(node) => loadData(node as DataTreeNode)}
            onSelect={(_keys, info) => {
              void onSelectNode(info.node as unknown as DataTreeNode);
            }}
            style={{ fontSize: 12, background: 'transparent', marginTop: 8 }}
          />
        </div>

        {/* 中：本地资讯 + 预览 */}
        <div style={colStyle}>
          <Text strong>📄 {t('Data.localInfo')}</Text>
          <div className="custom-scroll" style={{ ...boxStyle, flexShrink: 0, maxHeight: 168, minHeight: 96, overflow: 'auto' }}>
            {localInfo}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <Text strong>👁 {t('Data.localPreview')}</Text>
            {localText?.truncated && <Tag color="orange">{t('Data.truncated')}</Tag>}
          </div>
          <div className="custom-scroll" style={{ ...boxStyle, flex: 1, minHeight: 0, overflow: 'auto' }}>
            {localPreview}
          </div>
        </div>

        {/* 右：CDN 镜像资讯 + 预览 */}
        <div style={colStyle}>
          <Text strong>☁️ {t('Data.cdnInfo')}</Text>
          <div className="custom-scroll" style={{ ...boxStyle, flexShrink: 0, maxHeight: 168, minHeight: 96, overflow: 'auto' }}>
            {cdnInfo}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <Text strong>🌐 {t('Data.cdnPreview')}</Text>
            {compare && (
              <Tag color={compare === 'same' ? 'green' : compare === 'diff' ? 'red' : 'orange'}>
                {t(`Data.${compare}`)}
              </Tag>
            )}
          </div>
          <div className="custom-scroll" style={{ ...boxStyle, flex: 1, minHeight: 0, overflow: 'auto' }}>
            {cdnPreview}
          </div>
        </div>
      </div>

      {/* 状态栏（对应 Python 版 QStatusBar） */}
      <div
        style={{
          flexShrink: 0,
          fontSize: 12,
          padding: '4px 10px',
          borderRadius: 4,
          background: 'rgba(22,119,255,.12)',
        }}
      >
        {t('Data.status')}: {status}
      </div>
    </div>
  );
}
