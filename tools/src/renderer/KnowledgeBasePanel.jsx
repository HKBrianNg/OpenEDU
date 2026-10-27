// 知识库配图面板：从本地读全量条目 → 勾选 → 生成图片 → 落盘 + 回写 imageUrl
//
// 跟 Web 上那张卡不同：这里真的把图做出来。Web 端只能导出清单，是因为
// 生图服务的凭证绑在 IDE 会话里，浏览器拿不到；桌面端走公开图源（不需要 key），
// 主进程直连，所以「生成 → 存 content/ → 回写 imageUrl」一条龙都能在这儿做完。

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Popconfirm,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useI18n } from './LocaleProvider';

const { Text } = Typography;

export default function KnowledgeBasePanel({ dataRoot }) {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [chapter, setChapter] = useState('__all__');
  const [keyword, setKeyword] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [saving, setSaving] = useState(false);
  // 图源：ai = 文生图（插画风），photo = Wikimedia 真实照片
  const [source, setSource] = useState('ai');
  const [progress, setProgress] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await window.api.kbLoad();
    if (!res.ok) {
      setError(res.error);
      setRows([]);
    } else {
      setRows(res.data.rows);
      setProblems(res.data.problems ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, dataRoot]);

  const chapters = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => m.set(r.contentLink, r.chapter));
    return [...m.entries()].map(([value, label]) => ({ value, label }));
  }, [rows]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter((r) => {
      if (chapter !== '__all__' && r.contentLink !== chapter) return false;
      if (onlyMissing && r.hasImage) return false;
      if (!kw) return true;
      return (
        r.title.toLowerCase().includes(kw) || r.titleEn.toLowerCase().includes(kw)
      );
    });
  }, [rows, chapter, keyword, onlyMissing]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedKeys.includes(r.key)),
    [rows, selectedKeys]
  );

  const missingCount = useMemo(() => rows.filter((r) => !r.hasImage).length, [rows]);

  // 选中项里真正有图的条数 —— 决定「删除配图」点了有没有实际效果
  const selectedWithImageCount = useMemo(
    () => selectedRows.filter((r) => r.hasImage).length,
    [selectedRows]
  );

  // 一张图十几秒，靠事件推进度；组件卸载时记得退订
  useEffect(() => window.api.onKbProgress(setProgress), []);

  const handleGenerate = async () => {
    setSaving(true);
    setProgress(null);
    const res = await window.api.kbGenerate({ items: selectedRows, source });
    setSaving(false);
    setProgress(null);
    // res 是 guard 的信封；真正的成败在 res.data.ok 里。
    // 只看 res.ok 的话，部分失败会被当成全部成功。
    const done = res.data?.results ?? [];
    const failed = done.filter((r) => !r.ok);
    if (!res.ok || !res.data?.ok) {
      message.error(
        failed.length
          ? `${failed.length}/${done.length} ${t('Kb.failed')}：${failed[0].error}`
          : `${t('Kb.generateFailed')}：${res.error}`
      );
    } else {
      message.success(`${t('Kb.generated')} ${done.length} ${t('Kb.imagesUnit')}，${t('Kb.imageUrlWritten')}`);
      setSelectedKeys([]);
    }
    load();
  };

  /** 删掉选中条目的配图（没图的会被跳过），删完重新读一遍好立刻更新计数 */
  const handleDelete = async (single) => {
    const targets = single ? [single] : selectedRows;
    if (targets.length === 0) return;

    setDeleting(true);
    const res = await window.api.kbDeleteImages(targets);
    setDeleting(false);

    // 同样是信封：真正的成败在 res.data 里
    const done = res.data?.results ?? [];
    const failed = done.filter((r) => !r.ok);
    if (!res.ok || !res.data?.ok) {
      message.error(
        failed.length
          ? `${failed.length}/${done.length} ${t('Kb.deleteImage')}${t('Kb.failed')}：${failed[0].error}`
          : `${t('Kb.deleteFailed')}：${res.error}`
      );
    } else {
      const cleared = done.filter((r) => !r.skipped).length;
      const skipped = done.length - cleared;
      message.success(
        skipped
          ? `${t('Kb.deleted')} ${cleared} ${t('Kb.imagesUnit')}，${skipped} ${t('Kb.noImageSuffix')}`
          : `${t('Kb.deleted')} ${cleared} ${t('Kb.imagesUnit')}`
      );
      setSelectedKeys([]);
    }
    load();
  };

  const columns = [
    { title: t('Kb.colChapter'), dataIndex: 'chapter', width: 100 },
    { title: t('Kb.colTitle'), dataIndex: 'title', ellipsis: true },
    { title: 'English', dataIndex: 'titleEn', ellipsis: true },
    {
      title: t('Kb.colImage'),
      dataIndex: 'hasImage',
      width: 90,
      render: (has) =>
        has ? <Tag color="green">{t('Kb.has')}</Tag> : <Tag color="orange">{t('Kb.missing')}</Tag>,
    },
    {
      title: t('Kb.colActions'),
      key: 'op',
      width: 70,
      render: (_, row) =>
        row.hasImage ? (
          <Popconfirm
            title={`${t('Kb.deleteAskPrefix')}「${row.title}」${t('Kb.deleteAskSuffix')}`}
            description={t('Kb.deleteAskDesc')}
            okText={t('Kb.delete')}
            cancelText={t('Common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(row)}
          >
            <Button type="link" size="small" danger loading={deleting}>
              {t('Kb.delete')}
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div>
      {error && (
        <Alert
          type="error"
          showIcon
          message={t('Kb.loadFailed')}
          description={error}
          style={{ marginBottom: 12 }}
        />
      )}
      {problems.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${problems.length} ${t('Kb.problemsSuffix')}`}
          description={problems.join('；')}
          style={{ marginBottom: 12 }}
        />
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          value={chapter}
          onChange={setChapter}
          style={{ width: 160 }}
          options={[{ value: '__all__', label: t('Kb.allChapters') }, ...chapters]}
        />
        <Input.Search
          placeholder={t('Kb.searchPlaceholder')}
          allowClear
          style={{ width: 220 }}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Checkbox
          checked={onlyMissing}
          onChange={(e) => setOnlyMissing(e.target.checked)}
        >
          {t('Kb.onlyMissing')}
        </Checkbox>
        <Button onClick={load}>{t('Kb.reload')}</Button>
        <Button
          type="primary"
          disabled={selectedRows.length === 0}
          loading={saving}
          onClick={handleGenerate}
        >
          {t('Kb.generate')}（{selectedRows.length} {t('Kb.imagesUnit')}）
        </Button>
        <Button
          danger
          disabled={selectedRows.length === 0 || deleting}
          loading={deleting}
          onClick={handleDelete}
        >
          {t('Kb.deleteImage')}
          {selectedRows.length > 0 && `（${selectedWithImageCount} ${t('Kb.hasImageCount')}）`}
        </Button>
        <Button
          disabled={selectedRows.length === 0 || saving}
          onClick={async () => {
            const res = await window.api.kbSaveTasks(selectedRows);
            if (res.ok) message.success(`${t('Kb.written')} ${res.data.count} ${t('Kb.items')} → ${res.data.path}`);
            else message.error(`${t('Kb.writeFailed')}：${res.error}`);
          }}
        >
          {t('Kb.exportList')}
        </Button>
      </Space>

      <div style={{ marginBottom: 12 }}>
        <Space size={4} align="center">
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('Kb.sourceLabel')}
          </Text>
          <Select
            value={source}
            onChange={setSource}
            size="small"
            style={{ width: 140 }}
            options={[
              { value: 'ai', label: t('Kb.sourceAi') },
              { value: 'photo', label: t('Kb.sourcePhoto') },
            ]}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('Kb.sourceNote')}
          </Text>
        </Space>
      </div>

      {progress && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={
            progress.stage === 'start'
              ? `${t('Kb.generating')} ${progress.n}/${progress.total}：${progress.title}`
              : `${progress.n}/${progress.total} ${progress.title} — ${
                  progress.ok ? `${t('Kb.saved')} ${progress.file}` : `${t('Kb.generateFailed')}：${progress.error}`
                }`
          }
        />
      )}

      {rows.length > 0 && (
        <Progress
          percent={Math.round(((rows.length - missingCount) / rows.length) * 100)}
          format={() => `${rows.length - missingCount} / ${rows.length} ${t('Kb.hasImages')}`}
          style={{ marginBottom: 12 }}
        />
      )}

      <Table
        rowKey="key"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        scroll={{ y: 460 }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: setSelectedKeys,
        }}
        footer={() => (
          <Text type="secondary">
            {t('Kb.total')} {rows.length} {t('Kb.items')}，{t('Kb.filtered')} {filtered.length}，
            {t('Kb.selected')} {selectedRows.length}
          </Text>
        )}
      />
    </div>
  );
}
