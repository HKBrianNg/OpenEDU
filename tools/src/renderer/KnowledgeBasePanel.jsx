// 知识库配图面板：从本地读全量条目 → 勾选 → 写 _tasks/pending-images.json
//
// 跟 Web 上那张卡做的是同一件事，但这里没有「生产环境写不了」的限制：
// 数据直接读本地文件，清单直接落盘，不经过 CDN、不需要 dev server。

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';

const { Text } = Typography;
const CREDITS_PER_IMAGE = 20;

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

  const handleGenerate = async () => {
    setSaving(true);
    const res = await window.api.kbSaveTasks(selectedRows);
    setSaving(false);
    if (!res.ok) {
      message.error(`写入失败：${res.error}`);
      return;
    }
    message.success(`已写入 ${res.data.count} 条 → ${res.data.path}`);
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
          生成清单（{selectedRows.length} 张 / {selectedRows.length * CREDITS_PER_IMAGE} 积分）
        </Button>
      </Space>

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
