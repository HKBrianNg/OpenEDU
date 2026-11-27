// desktop/src/pages/admin/PhoneAdmin/components/PhoneFilesPanel.tsx
//
// 手机发来的文件列表（原「📁 档案传输」Tab 的实质内容）：
// 指定保存目录、收到文件列表（缩略图/预览/打开所在文件夹）。
// 连接指引与连接状态在相机面板的「连接」Tab，这里不再重复。

import { useEffect, useRef, useState } from 'react';
import { App, Button, Modal, Space, Table, Typography } from 'antd';
import { useLocale } from '../../../../store/LocaleContext';

const { Text } = Typography;

interface PhoneFileEntry {
  file: string;
  name: string;
  size: number;
  at: number;
}

interface PhoneState {
  saveDir: string;
  url: string;
  connected: boolean;
  recent: PhoneFileEntry[];
}

type PreviewResult = {
  ok?: boolean;
  kind?: 'image' | 'text' | 'other';
  dataUrl?: string;
  text?: string;
  error?: string;
};

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function PhoneFilesPanel() {
  const { t } = useLocale();
  const { message } = App.useApp();

  const [saveDir, setSaveDir] = useState('');
  const [rows, setRows] = useState<PhoneFileEntry[]>([]);
  const [preview, setPreview] = useState<{ entry: PhoneFileEntry; result: PreviewResult } | null>(null);
  /** 缩略图缓存：file → dataUrl（'' 表示非图片或取不到，占位图标） */
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const thumbRequested = useRef<Set<string>>(new Set());

  const isImageName = (name: string) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);

  const loadState = async () => {
    const s = (await window.ipcRenderer.invoke('phone:get-state')) as PhoneState | null;
    if (s) {
      setSaveDir(s.saveDir);
      setRows(s.recent);
    }
  };

  useEffect(() => {
    void loadState();
  }, []);

  useEffect(() => {
    const ipc = window.ipcRenderer;
    const onFile = (_e: unknown, entry: PhoneFileEntry) => {
      setRows((r) => [entry, ...r].slice(0, 100));
      message.success(`${t('Phone.received')}: ${entry.name}`);
    };
    ipc.on('camera:phone-file', onFile);
    return () => {
      ipc.off('camera:phone-file', onFile);
    };
  }, []);

  /** 对列表里的图片文件批量取缩略图（每个只请求一次） */
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const r of rows) {
        if (!isImageName(r.name) || thumbRequested.current.has(r.file)) continue;
        thumbRequested.current.add(r.file);
        const d = (await window.ipcRenderer.invoke('phone:get-thumb', r.file)) as string | null;
        if (!alive) return;
        setThumbs((m) => ({ ...m, [r.file]: d || '' }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [rows]);

  const pickDir = async () => {
    const r = (await window.ipcRenderer.invoke('phone:pick-dir')) as {
      ok: boolean;
      dir?: string;
      error?: string;
      canceled?: boolean;
    } | null;
    if (r?.ok && r.dir) {
      setSaveDir(r.dir);
      message.success(`${t('Phone.saveDir')}: ${r.dir}`);
    } else if (r?.error) {
      message.error(r.error);
    }
  };

  const openDir = async (dir?: string) => {
    await window.ipcRenderer.invoke('phone:open-dir', dir);
  };

  /** 列表内预览：图片/文本在模态框里看，其余格式提示用系统程序打开 */
  const openPreview = async (entry: PhoneFileEntry) => {
    const result = (await window.ipcRenderer.invoke('phone:preview', entry.file)) as PreviewResult | null;
    if (!result || result.error) {
      message.error(result?.error || t('Phone.previewFail'));
      return;
    }
    setPreview({ entry, result });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 2px', overflow: 'auto' }}>
      {/* 保存目录 */}
      <Space wrap size="small">
        <Text strong>{t('Phone.saveDir')}:</Text>
        <Text code style={{ fontSize: 12 }}>{saveDir || '…'}</Text>
        <Button size="small" onClick={() => void pickDir()}>
          {t('Phone.pickDir')}
        </Button>
        <Button size="small" onClick={() => void openDir()}>
          {t('Phone.openDir')}
        </Button>
      </Space>

      {/* 收到的文件 */}
      <Table<PhoneFileEntry>
        size="small"
        rowKey="file"
        dataSource={rows}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: t('Phone.empty') }}
        columns={[
          {
            title: t('Phone.colName'),
            dataIndex: 'name',
            ellipsis: true,
            render: (v: string, r) => {
              const thumb = thumbs[r.file];
              return (
                <a
                  onClick={() => void openPreview(r)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  title={t('Phone.preview')}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      style={{
                        width: 44,
                        height: 44,
                        objectFit: 'cover',
                        borderRadius: 4,
                        border: '1px solid #eee',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        background: '#f5f5f5',
                        borderRadius: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      📄
                    </span>
                  )}
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                </a>
              );
            },
          },
          {
            title: t('Phone.colSize'),
            dataIndex: 'size',
            width: 110,
            render: (v: number) => fmtSize(v),
          },
          {
            title: t('Phone.colTime'),
            dataIndex: 'at',
            width: 170,
            render: (v: number) => new Date(v).toLocaleString(),
          },
          {
            title: t('Phone.colAction'),
            width: 180,
            render: (_: unknown, r) => (
              <Space size={4}>
                <Button size="small" onClick={() => void openPreview(r)}>
                  {t('Phone.preview')}
                </Button>
                <Button size="small" onClick={() => void openDir(r.file)}>
                  {t('Phone.openFolder')}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      {/* 预览模态框 */}
      <Modal
        open={!!preview}
        title={preview?.entry.name}
        onCancel={() => setPreview(null)}
        width={820}
        footer={[
          <Button key="sys" onClick={() => void openDir(preview?.entry.file)}>
            {t('Phone.openWithSystem')}
          </Button>,
          <Button key="close" type="primary" onClick={() => setPreview(null)}>
            {t('Phone.close')}
          </Button>,
        ]}
      >
        {preview?.result.kind === 'image' && (
          <img
            src={preview.result.dataUrl}
            alt={preview.entry.name}
            style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block', margin: '0 auto' }}
          />
        )}
        {preview?.result.kind === 'text' && (
          <pre
            style={{
              maxHeight: '55vh',
              overflow: 'auto',
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              background: '#fafafa',
              border: '1px solid #eee',
              borderRadius: 6,
              padding: 12,
            }}
          >
            {preview.result.text}
          </pre>
        )}
        {preview?.result.kind === 'other' && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#999' }}>
            {t('Phone.previewOther')}
          </div>
        )}
      </Modal>
    </div>
  );
}

PhoneFilesPanel.displayName = 'PhoneFilesPanel';
