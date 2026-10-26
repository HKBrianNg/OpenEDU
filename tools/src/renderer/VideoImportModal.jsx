// 从网上导入视频：搜经典动画 → 选一集 → 进目录（可选顺手抓字幕）
//
// 照着歌曲那套「从网上导入」做的：
//   搜 → 列表里挑一条 → 填年级/中英文名 → 保存
// 区别是视频这边存完还能立刻抓字幕，抓字幕的日志复用主面板那块 yt-dlp 日志区。

import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Text } = Typography;

/** 少儿英语常见系列（点一下就搜） */
const HOT_SERIES = [
  'Peppa Pig', 'Bluey', 'Cocomelon', 'Paw Patrol', 'Peppa Pig Chinese',
  'Maisy Mouse', 'Sesame Street', 'Super Simple Songs', 'Little Baby Bum',
  'Bing Bunny', 'Hey Duggee', 'Numberblocks', 'Alphablocks', 'Mickey Mouse Clubhouse',
  'Thomas the Tank Engine', 'Ben and Holly', 'Tayo the Little Bus', 'WordWorld',
];

export default function VideoImportModal({ open, onClose, grades, defaultGrade, onSaved }) {
  const [series, setSeries] = useState('');
  const [items, setItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const [target, setTarget] = useState(null);
  const [grade, setGrade] = useState(defaultGrade ?? '');
  const [titleEn, setTitleEn] = useState('');
  const [titleZh, setTitleZh] = useState('');
  const [fetchSubs, setFetchSubs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const doSearch = async (name) => {
    setSeries(name);
    setSearching(true);
    setError(null);
    setResult(null);
    const res = await window.api.videoSearch({ keyword: name, limit: 12 });
    setSearching(false);
    if (!res.ok) {
      setError(res.error);
      setItems([]);
      return;
    }
    setItems(res.data ?? []);
    if ((res.data ?? []).length === 0) setError('没搜到结果，换个关键词试试');
  };

  const handlePick = (v) => {
    setTarget(v);
    setResult(null);
    setTitleEn(v.title);
    setTitleZh('');
    setGrade((prev) => prev || defaultGrade || grades[0]?.value || '');
  };

  const handleSave = async () => {
    if (!target) return;
    if (!grade) {
      setResult({ ok: false, text: '先选一个年级' });
      return;
    }
    if (!String(titleEn).trim()) {
      setResult({ ok: false, text: '英文名不能为空 —— 台词文件名由它推出来' });
      return;
    }

    setSaving(true);
    setResult(null);
    const res = await window.api.videoImportOnline({
      grade,
      url: target.url,
      titleEn: String(titleEn).trim(),
      titleZh: String(titleZh).trim(),
      series: target.channel ?? '',
      fetchSubs,
    });
    setSaving(false);

    if (!res.ok) {
      setResult({ ok: false, text: res.error });
      return;
    }

    const t = res.data.transcript;
    setResult({
      ok: true,
      text:
        t == null
          ? `已加进目录：#${res.data.id}（没抓字幕，之后可以在列表里单独抓）`
          : t.ok
            ? `已加进目录：#${res.data.id}，并抓到 ${t.lines} 句台词 → ${t.file}`
            : `已加进目录：#${res.data.id}，但字幕没抓到：${t.error}`,
    });
    onSaved?.();
  };

  const closeAll = () => {
    setItems([]);
    setError(null);
    setSeries('');
    setTarget(null);
    setResult(null);
    onClose?.();
  };

  const columns = [
    {
      title: '视频',
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
      title: '时长',
      width: 90,
      render: (_, v) => v.duration || <Tag>未知</Tag>,
    },
    {
      title: '操作',
      width: 140,
      render: (_, v) => (
        <Space size={4}>
          <Button size="small" type="link" href={v.url} target="_blank" rel="noopener noreferrer">
            打开
          </Button>
          <Button size="small" type="primary" onClick={() => handlePick(v)}>
            导入
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal open={open} title="从网上导入视频" onCancel={closeAll} width={900} footer={null}>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          常见系列（点一下就搜）
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
          placeholder="系列名或关键词"
          value={series}
          onChange={(e) => setSeries(e.target.value)}
          onPressEnter={() => doSearch(series)}
          style={{ width: 260 }}
        />
        <Button type="primary" loading={searching} onClick={() => doSearch(series)}>
          搜索
        </Button>
      </Space>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

      <Table
        rowKey="videoId"
        size="small"
        loading={searching}
        columns={columns}
        dataSource={items}
        pagination={false}
        scroll={{ y: 260 }}
        locale={{ emptyText: '搜一下就有结果了' }}
      />

      <Modal
        open={Boolean(target)}
        title={`导入「${target?.title ?? ''}」`}
        onCancel={() => setTarget(null)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: 16 }} size="middle">
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>年级</div>
            <Select
              value={grade}
              onChange={setGrade}
              style={{ width: '100%' }}
              options={grades}
              placeholder="选一个年级"
            />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>English（决定台词文件名）</div>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>中文名（可留空）</div>
            <Input value={titleZh} onChange={(e) => setTitleZh(e.target.value)} />
          </div>
          <Checkbox checked={fetchSubs} onChange={(e) => setFetchSubs(e.target.checked)}>
            保存后立刻抓字幕
          </Checkbox>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {target?.duration ? `时长 ${target.duration} · ` : ''}
            {target?.url}
          </Text>
          {result && (
            <Alert type={result.ok ? 'success' : 'error'} showIcon message={result.text} />
          )}
        </Space>
      </Modal>
    </Modal>
  );
}
