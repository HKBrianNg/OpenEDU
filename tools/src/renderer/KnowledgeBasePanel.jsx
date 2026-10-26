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

const { Text } = Typography;

export default function KnowledgeBasePanel({ dataRoot }) {
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
          ? `${failed.length}/${done.length} 张失败：${failed[0].error}`
          : `生成失败：${res.error}`
      );
    } else {
      message.success(`已生成 ${done.length} 张图，imageUrl 已回写`);
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
          ? `${failed.length}/${done.length} 张删除失败：${failed[0].error}`
          : `删除失败：${res.error}`
      );
    } else {
      const cleared = done.filter((r) => !r.skipped).length;
      const skipped = done.length - cleared;
      message.success(
        skipped
          ? `已删除 ${cleared} 张配图，${skipped} 条本来就没图`
          : `已删除 ${cleared} 张配图`
      );
      setSelectedKeys([]);
    }
    load();
  };

  const columns = [
    { title: '章节', dataIndex: 'chapter', width: 100 },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: 'English', dataIndex: 'titleEn', ellipsis: true },
    {
      title: '配图',
      dataIndex: 'hasImage',
      width: 90,
      render: (has) => (has ? <Tag color="green">有</Tag> : <Tag color="orange">缺</Tag>),
    },
    {
      title: '操作',
      key: 'op',
      width: 70,
      render: (_, row) =>
        row.hasImage ? (
          <Popconfirm
            title={`删掉「${row.title}」的配图？`}
            description="图片文件会被删除，imageUrl 也会清掉"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(row)}
          >
            <Button type="link" size="small" danger loading={deleting}>
              删除
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
          message="读取失败"
          description={error}
          style={{ marginBottom: 12 }}
        />
      )}
      {problems.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${problems.length} 个章节有问题`}
          description={problems.join('；')}
          style={{ marginBottom: 12 }}
        />
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          value={chapter}
          onChange={setChapter}
          style={{ width: 160 }}
          options={[{ value: '__all__', label: '全部章节' }, ...chapters]}
        />
        <Input.Search
          placeholder="标题关键字"
          allowClear
          style={{ width: 220 }}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Checkbox
          checked={onlyMissing}
          onChange={(e) => setOnlyMissing(e.target.checked)}
        >
          只看缺图
        </Checkbox>
        <Button onClick={load}>重新读取</Button>
        <Button
          type="primary"
          disabled={selectedRows.length === 0}
          loading={saving}
          onClick={handleGenerate}
        >
          生成配图（{selectedRows.length} 张）
        </Button>
        <Button
          danger
          disabled={selectedRows.length === 0 || deleting}
          loading={deleting}
          onClick={handleDelete}
        >
          删除配图
          {selectedRows.length > 0 && `（${selectedWithImageCount} 张有图）`}
        </Button>
        <Button
          disabled={selectedRows.length === 0 || saving}
          onClick={async () => {
            const res = await window.api.kbSaveTasks(selectedRows);
            if (res.ok) message.success(`已写入 ${res.data.count} 条 → ${res.data.path}`);
            else message.error(`写入失败：${res.error}`);
          }}
        >
          导出清单（备用）
        </Button>
      </Space>

      <div style={{ marginBottom: 12 }}>
        <Space size={4} align="center">
          <Text type="secondary" style={{ fontSize: 12 }}>
            图源
          </Text>
          <Select
            value={source}
            onChange={setSource}
            size="small"
            style={{ width: 140 }}
            options={[
              { value: 'ai', label: 'AI 插画（文生图）' },
              { value: 'photo', label: '真实照片（Wikimedia）' },
            ]}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            都不用 key。图存进 content/，imageUrl 自动回写；一张十几秒，多的慢慢跑。
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
              ? `正在生成 ${progress.n}/${progress.total}：${progress.title}`
              : `${progress.n}/${progress.total} ${progress.title} — ${
                  progress.ok ? `已保存 ${progress.file}` : `失败：${progress.error}`
                }`
          }
        />
      )}

      {rows.length > 0 && (
        <Progress
          percent={Math.round(((rows.length - missingCount) / rows.length) * 100)}
          format={() => `${rows.length - missingCount} / ${rows.length} 已有配图`}
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
            共 {rows.length} 条，当前筛选 {filtered.length} 条，已选 {selectedRows.length} 条
          </Text>
        )}
      />
    </div>
  );
}
