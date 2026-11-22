// desktop/src/pages/admin/VideoAdmin/index.tsx
//
// 视频目录管理（EnglishVideo）：列表 + 年级筛选 + 从网络导入 + 编辑 + 删除 + 抓字幕。
// 设计对齐 SongsAdmin；数据结构沿用 tools 的 EnglishVideo 目录（年级 JSON + 台词）。

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { VideoImportModal } from './components/VideoImportModal';
import { useLocale } from '../../../store/LocaleContext';
import type { GradeOption, VideoRow } from './videoTypes';

const { Text } = Typography;

export function VideoAdmin() {
  const { t } = useLocale();
  const { message: messageApi, modal: modalApi } = App.useApp();

  const [rows, setRows] = useState<VideoRow[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterGrade, setFilterGrade] = useState<string | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<VideoRow | null>(null);
  const [editForm] = Form.useForm<{
    series: string;
    episode: string;
    titleEn: string;
    titleZh: string;
  }>();
  const [editSaving, setEditSaving] = useState(false);

  const [fetchingKey, setFetchingKey] = useState<string | null>(null);

  // ─── 批量抓字幕（勾选 → 逐条 yt-dlp → 进度回显） ────────
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    stage: 'start' | 'done';
    n: number;
    total: number;
    titleEn: string;
    ok?: boolean;
    error?: string;
    lines?: number;
  } | null>(null);

  // ─── 加载 ──────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.ipcRenderer?.invoke('videos:load');
      if (!res?.ok) {
        setError(res?.error || 'load failed');
        setRows([]);
        setGrades([]);
        setProblems([]);
      } else {
        setRows(res.rows ?? []);
        setGrades(res.grades ?? []);
        setProblems(res.problems ?? []);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 批量抓字幕进度事件
  useEffect(() => {
    const onProgress = (_e: unknown, p: any) => setBatchProgress(p);
    window.ipcRenderer?.on('videos:progress', onProgress);
    return () => {
      window.ipcRenderer?.off('videos:progress', onProgress);
    };
  }, []);

  const visibleRows = useMemo(
    () => (filterGrade ? rows.filter((r) => r.grade === filterGrade) : rows),
    [rows, filterGrade],
  );

  // ─── 编辑 / 删除 / 抓字幕 ──────────────────────────────

  const handleEdit = (row: VideoRow) => {
    setEditingRow(row);
    editForm.setFieldsValue({
      series: row.series,
      episode: row.episode,
      titleEn: row.titleEn,
      titleZh: row.titleZh,
    });
    setEditModalOpen(true);
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setEditingRow(null);
  };

  const handleUpdate = async () => {
    if (!editingRow) return;
    let values: { series: string; episode: string; titleEn: string; titleZh: string };
    try {
      values = await editForm.validateFields();
    } catch {
      return;
    }
    setEditSaving(true);
    try {
      const res = await window.ipcRenderer?.invoke('videos:update', {
        grade: editingRow.grade,
        id: editingRow.id,
        ...values,
      });
      if (!res?.ok) {
        messageApi.error(`${t('Video.editFailed')}：${res?.error}`);
      } else {
        messageApi.success(t('Video.updated'));
        handleEditClose();
        load();
      }
    } catch (err: any) {
      messageApi.error(`${t('Video.editFailed')}：${err?.message || err}`);
    }
    setEditSaving(false);
  };

  const handleRemove = (row: VideoRow) => {
    modalApi.confirm({
      title: `${t('Video.delete')}「${row.titleEn || row.titleZh || `#${row.id}`}」？`,
      content: t('Video.confirmContent'),
      okText: t('Video.deleteEntry'),
      okButtonProps: { danger: true },
      cancelText: t('Common.cancel'),
      onOk: async () => {
        try {
          const res = await window.ipcRenderer?.invoke('videos:remove', {
            grade: row.grade,
            id: row.id,
          });
          if (!res?.ok) {
            messageApi.error(`${t('Video.deleteFailed')}：${res?.error}`);
            return;
          }
          messageApi.success(t('Video.deleted'));
          load();
        } catch (err: any) {
          messageApi.error(`${t('Video.deleteFailed')}：${err?.message || err}`);
        }
      },
    });
  };

  const handleFetchSubs = async (row: VideoRow) => {
    setFetchingKey(row.key);
    try {
      const res = await window.ipcRenderer?.invoke('videos:fetch-transcript', {
        grade: row.grade,
        id: row.id,
        titleEn: row.titleEn,
        url: row.url,
        transcriptFile: row.transcriptFile,
      });
      if (!res?.ok) {
        messageApi.error(`${t('Video.subsFailed')}：${res?.error}`);
      } else {
        messageApi.success(
          `${t('Video.gotLines')} ${res.data?.lines ?? 0} → ${res.data?.file ?? ''}`,
        );
        load();
      }
    } catch (err: any) {
      messageApi.error(`${t('Video.subsFailed')}：${err?.message || err}`);
    }
    setFetchingKey(null);
  };

  const handleBatchFetchSubs = async () => {
    const items = visibleRows.filter((r) => selectedKeys.includes(r.key));
    if (items.length === 0) return;

    setBatchBusy(true);
    setBatchProgress(null);
    let res: any;
    try {
      res = await window.ipcRenderer?.invoke('videos:fetch-transcripts-batch', {
        items: items.map((r) => ({
          grade: r.grade,
          id: r.id,
          titleEn: r.titleEn,
          url: r.url,
          transcriptFile: r.transcriptFile,
        })),
      });
    } catch (err: any) {
      res = { ok: false, error: err?.message || String(err) };
    }
    setBatchBusy(false);
    setBatchProgress(null);

    const done: any[] = res?.data?.results ?? [];
    const okCount = done.filter((r) => r.ok).length;
    const failCount = done.length - okCount;
    if (!res?.ok || !res?.data?.ok) {
      messageApi.warning(
        `${t('Video.batchDone')} ${okCount}/${done.length}，${t('Video.subsFailed')} ${failCount}`,
      );
    } else {
      messageApi.success(`${t('Video.batchDone')} ${okCount}/${done.length}`);
    }
    setSelectedKeys([]);
    load();
  };

  // ─── 列定义 ────────────────────────────────────────────

  const columns: ColumnsType<VideoRow> = [
    {
      title: t('Video.colGrade'),
      dataIndex: 'gradeName',
      width: 90,
      render: (_, r) => <Tag color="blue">{r.gradeName || r.grade}</Tag>,
    },
    {
      title: t('Video.colSeries'),
      width: 150,
      ellipsis: true,
      render: (_, r) => (
        <span>
          {r.series || '-'}
          {r.episode ? <Text type="secondary">{` · ${r.episode}`}</Text> : null}
        </span>
      ),
    },
    {
      title: t('Video.colTitleEn'),
      dataIndex: 'titleEn',
      width: 220,
      ellipsis: true,
    },
    {
      title: t('Video.colTitleZh'),
      dataIndex: 'titleZh',
      width: 160,
      ellipsis: true,
      render: (_, r) => r.titleZh || '-',
    },
    {
      title: t('Video.colDuration'),
      dataIndex: 'duration',
      width: 80,
      render: (_, r) => r.duration || '-',
    },
    {
      title: t('Video.colChannel'),
      dataIndex: 'channel',
      width: 140,
      ellipsis: true,
      render: (_, r) => r.channel || '-',
    },
    {
      title: t('Video.colTranscript'),
      width: 100,
      render: (_, r) =>
        r.hasTranscript ? (
          <Tag color="green">{`${t('Video.hasSubs')} · ${r.lineCount}`}</Tag>
        ) : (
          <Tag>{t('Video.noSubs')}</Tag>
        ),
    },
    {
      title: t('Video.colActions'),
      width: 200,
      render: (_, r) => (
        <Space size={0}>
          <Button
            size="small"
            type="link"
            loading={fetchingKey === r.key}
            onClick={() => handleFetchSubs(r)}
          >
            {t('Video.fetchSubs')}
          </Button>
          <Button size="small" type="link" onClick={() => handleEdit(r)}>
            {t('Video.edit')}
          </Button>
          <Button size="small" danger type="link" onClick={() => handleRemove(r)}>
            {t('Video.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  // ─── 渲染 ──────────────────────────────────────────────

  return (
    <div>
      {error && (
        <Alert
          type="error"
          showIcon
          title={t('Video.loadFailed')}
          description={error}
          style={{ marginBottom: 12 }}
        />
      )}
      {problems.length > 0 && (
        <Alert
          type="warning"
          showIcon
          title={t('Video.problems')}
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          }
          style={{ marginBottom: 12 }}
        />
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          value={filterGrade}
          onChange={(v) => setFilterGrade(v || undefined)}
          allowClear
          placeholder={t('Video.filterGrade')}
          style={{ width: 160 }}
          options={grades.map((g) => ({ value: g.value, label: g.label }))}
        />
        <Button onClick={load}>{t('Video.reload')}</Button>
        <Button type="primary" onClick={() => setImportOpen(true)}>
          {t('Video.importOnline')}
        </Button>
        <Button
          disabled={selectedKeys.length === 0 || batchBusy || fetchingKey !== null}
          loading={batchBusy}
          onClick={handleBatchFetchSubs}
        >
          {t('Video.batchFetchSubs')}（{selectedKeys.length} {t('Video.itemsUnit')}）
        </Button>
      </Space>

      {batchProgress && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={
            batchProgress.stage === 'start'
              ? `${t('Video.batchFetching')} ${batchProgress.n}/${batchProgress.total}：${batchProgress.titleEn}`
              : `${batchProgress.n}/${batchProgress.total} ${batchProgress.titleEn} — ${
                  batchProgress.ok
                    ? `${t('Video.gotLines')} ${batchProgress.lines ?? 0}`
                    : `${t('Video.subsFailed')}：${batchProgress.error}`
                }`
          }
        />
      )}

      <Table<VideoRow>
        rowKey="key"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={visibleRows}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: setSelectedKeys,
        }}
        scroll={{ y: 420 }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        title={() => (
          <span>
            {t('Video.current')}：EnglishVideo ·{' '}
            {filterGrade ? `${visibleRows.length} / ${rows.length}` : rows.length}{' '}
            {t('Video.videosUnit')}
          </span>
        )}
      />

      {/* 编辑视频弹窗 */}
      <Modal
        title={t('Video.editTitle')}
        open={editModalOpen}
        onCancel={handleEditClose}
        onOk={handleUpdate}
        confirmLoading={editSaving}
        okText={t('Video.editOk')}
        cancelText={t('Common.cancel')}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="series" label={t('Video.seriesLabel')}>
            <Input />
          </Form.Item>
          <Form.Item name="episode" label={t('Video.episodeLabel')}>
            <Input />
          </Form.Item>
          <Form.Item
            name="titleEn"
            label={t('Video.colTitleEn')}
            rules={[{ required: true, message: t('Video.fillTitleEn') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="titleZh" label={t('Video.colTitleZh')}>
            <Input />
          </Form.Item>
        </Form>
        {editingRow && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {`${editingRow.grade} #${editingRow.id}`} · {editingRow.url}
          </Text>
        )}
      </Modal>

      {/* 从网络导入弹窗 */}
      <VideoImportModal
        open={importOpen}
        grades={grades}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />
    </div>
  );
}
