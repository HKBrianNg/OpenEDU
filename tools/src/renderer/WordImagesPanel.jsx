// EnglishWord 单词配图面板：列出每个词的图 → 导入 / 生成缩略图 / 删除
//
// 前台卡片加载的是 content/thumb/ 里的缩略图（长边 400px），缩略图由 content/ 的原图生成。
// 所以「加一张图」是两步：放原图 + 生成缩略图。手敲命令容易漏第二步 ——
// 漏了前台就会退回原图（有的原图 3000px / 800KB，加载慢还糊）。
// 这里把两步合成一次操作，并且把「有原图没缩略图」单独标出来，一眼能看出哪些待补。

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
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

export default function WordImagesPanel({ dataRoot }) {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [problems, setProblems] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [chapter, setChapter] = useState('__all__');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('no-thumb'); // no-thumb | no-image | ok | all
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await window.api.wordImagesLoad();
    if (!res.ok) {
      setError(res.error);
      setRows([]);
      setCounts(null);
    } else {
      setRows(res.data.rows);
      setProblems(res.data.problems ?? []);
      setCounts(res.data.counts ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, dataRoot]);

  // 缩略图逐张生成，靠事件推进度；组件卸载时记得退订
  useEffect(() => window.api.onWordImagesProgress(setProgress), []);

  const chapters = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => m.set(r.contentLink, r.chapter));
    return [...m.entries()].map(([value, label]) => ({ value, label }));
  }, [rows]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter((r) => {
      if (chapter !== '__all__' && r.contentLink !== chapter) return false;
      if (status === 'no-image' && r.hasImage) return false;
      if (status === 'no-thumb' && !(r.hasImage && !r.hasThumb)) return false;
      if (status === 'ok' && !(r.hasImage && r.hasThumb)) return false;
      if (!kw) return true;
      return (
        r.name.toLowerCase().includes(kw) ||
        String(r.en ?? '').toLowerCase().includes(kw)
      );
    });
  }, [rows, chapter, keyword, status]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedKeys.includes(r.key)),
    [rows, selectedKeys]
  );

  const kb = (n) => (n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);

  /** 生成缩略图。files 为空 = 补所有缺的；否则只处理选中项 */
  const handleGenThumbs = async (files) => {
    setBusy(true);
    setProgress(null);
    const res = await window.api.wordImagesGenThumbs(files);
    setBusy(false);
    setProgress(null);

    // res 是 guard 的信封；真正的成败在 res.data.ok 里
    const done = res.data?.results ?? [];
    const failed = done.filter((r) => !r.ok);
    const copied = done.filter((r) => r.copied).length;
    if (!res.ok || !res.data?.ok) {
      message.error(
        failed.length
          ? `${failed.length}/${done.length} ${t('Words.failed')}：${failed[0].error}`
          : `${t('Words.generateFailed')}：${res.error}`
      );
    } else {
      message.success(
        copied
          ? `${t('Words.generated')} ${done.length} ${t('Words.imagesUnit')}（${copied} ${t('Words.copiedNote')}）`
          : `${t('Words.generated')} ${done.length} ${t('Words.imagesUnit')}`
      );
      setSelectedKeys([]);
    }
    load();
  };

  /** 给单个词配图：选本地文件 → 复制进 content/ → 顺手生成缩略图 */
  const handleImport = async (row) => {
    const srcPath = await window.api.pickFile('image');
    if (!srcPath) return;

    setBusy(true);
    const res = await window.api.wordImagesImport({
      contentLink: row.contentLink,
      index: row.index,
      srcPath,
    });
    setBusy(false);

    if (!res.ok) message.error(`${t('Words.importFailed')}：${res.error}`);
    else message.success(`${t('Words.imported')} ${row.name || row.en} → ${res.data.file}`);
    load();
  };

  const handleDelete = async (single) => {
    const targets = single ? [single] : selectedRows;
    if (targets.length === 0) return;

    setBusy(true);
    const res = await window.api.wordImagesDelete(targets);
    setBusy(false);

    const done = res.data?.results ?? [];
    const failed = done.filter((r) => !r.ok);
    if (!res.ok || !res.data?.ok) {
      message.error(
        failed.length
          ? `${failed.length}/${done.length} ${t('Words.failed')}：${failed[0].error}`
          : `${t('Words.deleteFailed')}：${res.error}`
      );
    } else {
      const cleared = done.filter((r) => (r.removed?.length ?? 0) > 0).length;
      const skipped = done.length - cleared;
      message.success(
        skipped
          ? `${t('Words.deleted')} ${cleared} ${t('Words.imagesUnit')}，${skipped} ${t('Words.noImageSuffix')}`
          : `${t('Words.deleted')} ${cleared} ${t('Words.imagesUnit')}`
      );
      setSelectedKeys([]);
    }
    load();
  };

  const columns = [
    { title: t('Words.colChapter'), dataIndex: 'chapter', width: 90 },
    { title: t('Words.colName'), dataIndex: 'name', width: 110, ellipsis: true },
    { title: 'English', dataIndex: 'en', width: 130, ellipsis: true },
    {
      title: t('Words.colFile'),
      dataIndex: 'file',
      width: 150,
      ellipsis: true,
      render: (f) => <Text type="secondary" style={{ fontSize: 12 }}>{f}</Text>,
    },
    {
      title: t('Words.colOriginal'),
      dataIndex: 'hasImage',
      width: 110,
      render: (has, row) =>
        has ? (
          <Tag color="green">{kb(row.imageBytes)}</Tag>
        ) : (
          <Tag color="orange">{t('Words.missing')}</Tag>
        ),
    },
    {
      title: t('Words.colThumb'),
      dataIndex: 'hasThumb',
      width: 110,
      render: (has, row) =>
        has ? (
          <Tag color="green">{kb(row.thumbBytes)}</Tag>
        ) : (
          // 有原图没缩略图 —— 前台会退回原图，这是最该处理的一类
          <Tag color={row.hasImage ? 'red' : 'default'}>{t('Words.missing')}</Tag>
        ),
    },
    {
      title: t('Words.colActions'),
      key: 'op',
      width: 170,
      render: (_, row) => (
        <Space size={0}>
          {row.hasImage ? (
            // 已经有图了，再配一次就是覆盖 —— 问一句，别把辛苦找来的图顶掉
            <Popconfirm
              title={`${t('Words.overwriteAskPrefix')}「${row.name || row.en}」${t('Words.overwriteAskSuffix')}`}
              okText={t('Words.overwrite')}
              cancelText={t('Common.cancel')}
              onConfirm={() => handleImport(row)}
            >
              <Button type="link" size="small">
                {t('Words.replace')}
              </Button>
            </Popconfirm>
          ) : (
            <Button type="link" size="small" onClick={() => handleImport(row)}>
              {t('Words.import')}
            </Button>
          )}
          {row.hasImage && !row.hasThumb && (
            <Button type="link" size="small" onClick={() => handleGenThumbs([row.file])}>
              {t('Words.genThumb')}
            </Button>
          )}
          {(row.hasImage || row.hasThumb) && (
            <Popconfirm
              title={`${t('Words.deleteAskPrefix')}「${row.name || row.en}」${t('Words.deleteAskSuffix')}`}
              description={t('Words.deleteAskDesc')}
              okText={t('Words.delete')}
              cancelText={t('Common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(row)}
            >
              <Button type="link" size="small" danger>
                {t('Words.delete')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {error && (
        <Alert
          type="error"
          showIcon
          message={t('Words.loadFailed')}
          description={error}
          style={{ marginBottom: 12 }}
        />
      )}
      {problems.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${problems.length} ${t('Words.problemsSuffix')}`}
          description={problems.join('；')}
          style={{ marginBottom: 12 }}
        />
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          value={chapter}
          onChange={setChapter}
          style={{ width: 150 }}
          options={[{ value: '__all__', label: t('Words.allChapters') }, ...chapters]}
        />
        <Select
          value={status}
          onChange={setStatus}
          style={{ width: 170 }}
          options={[
            { value: 'no-thumb', label: t('Words.filterNoThumb') },
            { value: 'no-image', label: t('Words.filterNoImage') },
            { value: 'ok', label: t('Words.filterOk') },
            { value: 'all', label: t('Words.filterAll') },
          ]}
        />
        <Input.Search
          placeholder={t('Words.searchPlaceholder')}
          allowClear
          style={{ width: 200 }}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Button onClick={load}>{t('Words.reload')}</Button>
        <Button
          type="primary"
          disabled={busy || (counts?.missingThumb ?? 0) === 0}
          loading={busy}
          onClick={() => handleGenThumbs([])}
        >
          {t('Words.genAllMissing')}（{counts?.missingThumb ?? 0} {t('Words.imagesUnit')}）
        </Button>
        <Button
          disabled={selectedRows.length === 0 || busy}
          onClick={() =>
            handleGenThumbs(selectedRows.filter((r) => r.hasImage).map((r) => r.file))
          }
        >
          {t('Words.genThumbs')}（{selectedRows.length} {t('Words.items')}）
        </Button>
        <Button
          danger
          disabled={selectedRows.length === 0 || busy}
          onClick={() => handleDelete(null)}
        >
          {t('Words.deleteImage')}
        </Button>
      </Space>

      {progress && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={
            progress.stage === 'start'
              ? `${t('Words.generating')} ${progress.n}/${progress.total}：${progress.file}`
              : `${progress.n}/${progress.total} ${progress.file} — ${
                  progress.ok
                    ? progress.copied
                      ? t('Words.usedOriginal')
                      : t('Words.saved')
                    : `${t('Words.generateFailed')}：${progress.error}`
                }`
          }
        />
      )}

      {counts && counts.uniqueImages > 0 && (
        <Progress
          percent={Math.round((counts.uniqueThumbs / counts.uniqueImages) * 100)}
          format={() => `${counts.uniqueThumbs} / ${counts.uniqueImages} ${t('Words.hasThumbs')}`}
          style={{ marginBottom: 12 }}
        />
      )}

      <Table
        rowKey="key"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        scroll={{ y: 440 }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: setSelectedKeys,
        }}
        footer={() => (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('Words.total')} {rows.length} {t('Words.items')}，{t('Words.filtered')}{' '}
            {filtered.length}，{t('Words.selected')} {selectedRows.length}
            {counts ? ` · ${t('Words.thumbNote')}` : ''}
          </Text>
        )}
      />
    </div>
  );
}
