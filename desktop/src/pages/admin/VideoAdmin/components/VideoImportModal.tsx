// desktop/src/pages/admin/VideoAdmin/components/VideoImportModal.tsx
//
// 从网上导入视频（移植 tools/src/renderer/VideoImportModal.jsx，适配 desktop）：
// 搜（yt-dlp ytsearch）→ 挑一条 → 填年级/中英文名 → 保存（可顺手抓字幕）。
// 抓字幕进度通过主进程 yt:log 事件回显。

import { useEffect, useRef, useState } from 'react';
import {
  Alert, Button, Checkbox, Input, Modal, Select, Space, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useLocale } from '../../../../store/LocaleContext';
import type { GradeOption, VideoSearchItem } from '../videoTypes';

const { Text } = Typography;

/** 少儿英语常见系列（点一下就搜） */
const HOT_SERIES = [
  'Peppa Pig', 'Bluey', 'Cocomelon', 'Paw Patrol', 'Peppa Pig Chinese',
  'Maisy Mouse', 'Sesame Street', 'Super Simple Songs', 'Little Baby Bum',
  'Bing Bunny', 'Hey Duggee', 'Numberblocks', 'Alphablocks',
  'Mickey Mouse Clubhouse', 'Thomas the Tank Engine', 'Ben and Holly',
  'Tayo the Little Bus', 'WordWorld',
];

interface VideoImportModalProps {
  open: boolean;
  grades: GradeOption[];
  onClose: () => void;
  onImported?: () => void;
}

export function VideoImportModal({ open, grades, onClose, onImported }: VideoImportModalProps) {
  const { t } = useLocale();

  const [series, setSeries] = useState('');
  const [items, setItems] = useState<VideoSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<VideoSearchItem | null>(null);
  const [grade, setGrade] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleZh, setTitleZh] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [fetchSubs, setFetchSubs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  // yt-dlp 日志（保存过程中主进程经 yt:log 推送）
  const [logLines, setLogLines] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const onLog = (_e: unknown, payload: any) => {
      const line = String(payload?.line ?? '');
      if (!line) return;
      logRef.current = [...logRef.current, line].slice(-8);
      setLogLines(logRef.current);
    };
    window.ipcRenderer?.on('yt:log', onLog);
    return () => {
      window.ipcRenderer?.off('yt:log', onLog);
    };
  }, [open]);

  const doSearch = async (name: string) => {
    setSeries(name);
    setSearching(true);
    setError(null);
    setResult(null);
    try {
      const res = await window.ipcRenderer?.invoke('videos:search', {
        keyword: name,
        limit: 12,
      });
      if (!res?.ok) {
        setError(res?.error || 'search failed');
        setItems([]);
      } else {
        setItems(res.data ?? []);
        if ((res.data ?? []).length === 0) setError(t('Video.Import.noResult'));
      }
    } catch (err: any) {
      setError(err?.message || String(err));
      setItems([]);
    }
    setSearching(false);
  };

  const handlePick = (v: VideoSearchItem) => {
    setTarget(v);
    setResult(null);
    setLogLines([]);
    logRef.current = [];
    setTitleEn(v.title);
    setTitleZh('');
    // 系列名拿当前搜索词当默认值，可改；不能拿 v.channel 顶替 ——
    // 那是 YouTube 频道名，跟库里的 series 不是一回事
    setSeriesName(series);
    setGrade((prev) => prev || grades[0]?.value || '');
  };

  const handleSave = async () => {
    if (!target) return;
    if (!grade) {
      setResult({ ok: false, text: t('Video.Import.needGrade') });
      return;
    }
    if (!String(titleEn).trim()) {
      setResult({ ok: false, text: t('Video.Import.needTitleEn') });
      return;
    }

    setSaving(true);
    setResult(null);
    setLogLines([]);
    logRef.current = [];
    try {
      const res = await window.ipcRenderer?.invoke('videos:import-online', {
        grade,
        url: target.url,
        titleEn: String(titleEn).trim(),
        titleZh: String(titleZh).trim(),
        series: String(seriesName).trim(),
        duration: target.duration ?? '',
        channel: target.channel ?? '',
        platform: 'YouTube',
        fetchSubs,
      });
      if (!res?.ok) {
        setResult({ ok: false, text: res?.error || 'import failed' });
        setSaving(false);
        return;
      }

      const tr = (res.data as any)?.transcript;
      setResult({
        ok: true,
        text:
          tr == null
            ? `${t('Video.Import.saved')}：#${res.data?.id}（${t('Video.Import.noSubsHint')}）`
            : tr.ok
              ? `${t('Video.Import.saved')}：#${res.data?.id}，${t('Video.gotLines')} ${tr.lines} → ${tr.file}`
              : `${t('Video.Import.saved')}：#${res.data?.id}，${t('Video.subsFailed')}：${tr.error}`,
      });
      onImported?.();
    } catch (err: any) {
      setResult({ ok: false, text: err?.message || String(err) });
    }
    setSaving(false);
  };

  const closeAll = () => {
    setItems([]);
    setError(null);
    setSeries('');
    setTarget(null);
    setResult(null);
    setLogLines([]);
    logRef.current = [];
    onClose();
  };

  const columns: ColumnsType<VideoSearchItem> = [
    {
      title: t('Video.Import.colVideo'),
      render: (_, v) => (
        <div>
          <div style={{ fontWeight: 500 }}>{v.title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {v.videoId}
            {v.channel ? ` · ${v.channel}` : ''}
          </Text>
        </div>
      ),
    },
    {
      title: t('Video.Import.colDuration'),
      width: 90,
      render: (_, v) => v.duration || <Tag>{t('Video.Import.unknown')}</Tag>,
    },
    {
      title: t('Video.Import.colActions'),
      width: 140,
      render: (_, v) => (
        <Space size={4}>
          <Button size="small" type="link" href={v.url} target="_blank" rel="noopener noreferrer">
            {t('Video.Import.open')}
          </Button>
          <Button size="small" type="primary" onClick={() => handlePick(v)}>
            {t('Video.Import.import')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal open={open} title={t('Video.Import.title')} onCancel={closeAll} width={900} footer={null}>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('Video.Import.hotSeries')}
        </Text>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 8,
            maxHeight: 120,
            overflowY: 'auto',
          }}
        >
          {HOT_SERIES.map((name) => (
            <Button
              key={name}
              size="small"
              type={series === name ? 'primary' : 'default'}
              onClick={() => doSearch(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      </div>

      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder={t('Video.Import.searchPlaceholder')}
          value={series}
          onChange={(e) => setSeries(e.target.value)}
          onPressEnter={() => doSearch(series)}
          style={{ width: 260 }}
        />
        <Button type="primary" loading={searching} onClick={() => doSearch(series)}>
          {t('Video.Import.search')}
        </Button>
      </Space>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}

      <Table
        rowKey="videoId"
        size="small"
        loading={searching}
        columns={columns}
        dataSource={items}
        pagination={false}
        scroll={{ y: 260 }}
        locale={{ emptyText: t('Video.Import.empty') }}
      />

      <Modal
        open={Boolean(target)}
        title={`${t('Video.Import.import')}「${target?.title ?? ''}」`}
        onCancel={() => setTarget(null)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t('Video.Import.save')}
        cancelText={t('Common.cancel')}
      >
        <Space orientation="vertical" style={{ width: '100%', marginTop: 16 }} size="middle">
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{t('Video.Import.gradeLabel')}</div>
            <Select
              value={grade}
              onChange={setGrade}
              style={{ width: '100%' }}
              options={grades.map((g) => ({ value: g.value, label: g.label }))}
              placeholder={t('Video.Import.gradePlaceholder')}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{t('Video.Import.titleEnLabel')}</div>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{t('Video.Import.titleZhLabel')}</div>
            <Input value={titleZh} onChange={(e) => setTitleZh(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{t('Video.Import.seriesLabel')}</div>
            <Input value={seriesName} onChange={(e) => setSeriesName(e.target.value)} />
          </div>
          <Checkbox checked={fetchSubs} onChange={(e) => setFetchSubs(e.target.checked)}>
            {t('Video.Import.fetchSubs')}
          </Checkbox>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {target?.duration ? `${t('Video.Import.durationPrefix')} ${target.duration} · ` : ''}
            {target?.url}
          </Text>
          {saving && logLines.length > 0 && (
            <Text
              type="secondary"
              style={{ fontSize: 11, whiteSpace: 'pre-wrap', display: 'block' }}
            >
              {logLines.join('\n')}
            </Text>
          )}
          {result && <Alert type={result.ok ? 'success' : 'error'} showIcon title={result.text} />}
        </Space>
      </Modal>
    </Modal>
  );
}
