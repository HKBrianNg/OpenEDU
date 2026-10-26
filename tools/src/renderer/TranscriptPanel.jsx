// 视频字幕面板：看台词进度 → 勾选 → 用本机 yt-dlp 抓字幕 → 写回本地
//
// 跟 Web 版最大的区别：这里真的能抓。yt-dlp 是命令行工具，浏览器跑不了，
// 桌面端可以。抓完直接写进仓库目录，不用再导出 JSON 交给我手工处理。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export default function TranscriptPanel({ dataRoot }) {
  const [rows, setRows] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [grade, setGrade] = useState('__all__');
  const [keyword, setKeyword] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(true);

  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const logBoxRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await window.api.videoLoad();
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

  // 订阅 yt-dlp 的实时输出
  useEffect(() => {
    const off = window.api.onYtLog((e) => {
      const text =
        e.type === 'start'
          ? `▶ [${e.id}] 开始抓取：${e.title ?? ''}`
          : e.type === 'done'
            ? `${e.ok ? '✓' : '✗'} [${e.id}] ${e.text ?? ''}`
            : `  ${e.line}`;
      setLogs((prev) => [...prev.slice(-300), text]); // 只留最后 300 行，别把内存撑爆
    });
    return off;
  }, []);

  useEffect(() => {
    // 新日志自动滚到底
    if (logBoxRef.current) logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
  }, [logs]);

  const grades = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => m.set(r.grade, r.gradeName));
    return [...m.entries()].map(([value, label]) => ({ value, label }));
  }, [rows]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter((r) => {
      if (grade !== '__all__' && r.grade !== grade) return false;
      if (onlyMissing && r.hasTranscript) return false;
      if (!kw) return true;
      return `${r.titleEn} ${r.titleZh} ${r.url}`.toLowerCase().includes(kw);
    });
  }, [rows, grade, keyword, onlyMissing]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedKeys.includes(r.key)),
    [rows, selectedKeys]
  );

  const doneCount = useMemo(() => rows.filter((r) => r.hasTranscript).length, [rows]);

  /** 导入本地字幕：yt-dlp 抓不到（YouTube 限制 / 网络问题）时的兜底 */
  const handleImport = async () => {
    if (selectedRows.length !== 1) {
      message.warning('先勾选一条视频再导入');
      return;
    }
    const p = await window.api.pickFile('subtitle');
    if (!p) return;
    const res = await window.api.videoImport({ item: selectedRows[0], srcPath: p });
    if (!res.ok) {
      message.error(`导入失败：${res.error}`);
      return;
    }
    message.success(`已导入 ${res.data.lines} 句 → ${res.data.file}`);
    load();
  };

  const handleFetch = async () => {
    if (selectedRows.length === 0) return;
    setRunning(true);
    setLogs([]);
    const res = await window.api.videoFetch(selectedRows);
    setRunning(false);
    if (!res.ok) {
      message.error(`抓取失败：${res.error}`);
      return;
    }
    const ok = res.data.results.filter((r) => r.ok).length;
    const bad = res.data.results.length - ok;
    if (bad === 0) message.success(`全部完成：${ok} 条`);
    else message.warning(`完成 ${ok} 条，失败 ${bad} 条（看下面的日志）`);
    load();
  };

  const columns = [
    { title: '年级', dataIndex: 'gradeName', width: 100 },
    { title: '#', dataIndex: 'id', width: 50 },
    { title: 'English', dataIndex: 'titleEn', ellipsis: true },
    { title: '中文', dataIndex: 'titleZh', width: 160, ellipsis: true },
    {
      title: 'URL',
      dataIndex: 'url',
      width: 90,
      render: (url) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            打开
          </a>
        ) : (
          <Tag color="orange">无</Tag>
        ),
    },
    {
      title: '台词',
      dataIndex: 'hasTranscript',
      width: 100,
      render: (has, r) =>
        has ? (
          <Tag color="green">{r.lineCount} 句</Tag>
        ) : (
          <Tag>缺</Tag>
        ),
    },
  ];

  return (
    <div>
      {error && (
        <Alert
          type="error"
          showIcon
          message="读取视频目录失败"
          description={error}
          style={{ marginBottom: 12 }}
        />
      )}
      {problems.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${problems.length} 个年级有问题`}
          description={problems.join('；')}
          style={{ marginBottom: 12 }}
        />
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          value={grade}
          onChange={setGrade}
          style={{ width: 160 }}
          options={[{ value: '__all__', label: '全部年级' }, ...grades]}
        />
        <Input.Search
          placeholder="标题关键字"
          allowClear
          style={{ width: 200 }}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Checkbox checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)}>
          只看缺台词
        </Checkbox>
        <Button onClick={load}>重新读取</Button>
        <Button
          type="primary"
          disabled={selectedRows.length === 0}
          loading={running}
          onClick={handleFetch}
        >
          抓取字幕（{selectedRows.length} 条）
        </Button>
        <Button disabled={selectedRows.length !== 1} onClick={handleImport}>
          导入本地字幕
        </Button>
      </Space>

      {rows.length > 0 && (
        <Progress
          percent={Math.round((doneCount / rows.length) * 100)}
          format={() => `${doneCount} / ${rows.length} 已有台词`}
          style={{ marginBottom: 12 }}
        />
      )}

      <Table
        rowKey="key"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        scroll={{ y: 360 }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
      />

      {logs.length > 0 && (
        <div
          ref={logBoxRef}
          style={{
            marginTop: 12,
            maxHeight: 160,
            overflow: 'auto',
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: 10,
            borderRadius: 4,
            fontFamily: 'Consolas, monospace',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
          }}
        >
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}

      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
        抓下来的是英文字幕，中文翻译字段留空，之后再补。
      </Text>
    </div>
  );
}
