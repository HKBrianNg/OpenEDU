// 从 gequhai.com（歌曲海）导入歌曲：搜歌手 → 预览歌词/试听 → 存进仓库
//
// 跟网上那套的区别：网上要绕 Worker（浏览器有 CORS + 站方的 cookie 挑战），
// 桌面端在主进程里直连，少一跳。存盘也一样 —— 这边真的写文件，
// 网上只能在 dev server 下写。
//
// 存下来的两个文件：
//   audio/<英文名 slug>.mp3   音频（下载后按文件头嗅探真实格式）
//   lyric/<英文名 slug>.lrc   歌词（带 [mm:ss.xx] 时间戳）

import { useState } from 'react';
import {
  Alert,
  Button,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';

const { Text } = Typography;

/** 中文歌手快捷入口（网上那套实测能搜到的） */
const CHINESE_SINGERS = [
  '周杰伦', '林俊杰', '陈奕迅', '王力宏', '张学友', '刘德华', '李荣浩', '薛之谦',
  '毛不易', '周深', '华晨宇', '邓紫棋', '孙燕姿', '蔡依林', '王菲', '张碧晨', '五月天',
];

/** 英文歌手 */
const ENGLISH_SINGERS = [
  'The Beatles', 'Bee Gees', 'Carpenters', 'Lionel Richie', 'Queen',
  'Elvis Presley', 'Michael Jackson', 'ABBA', 'Taylor Swift', 'Westlife',
  'Ed Sheeran', 'Adele',
];

/** 纯 ASCII —— 英文歌名可直接当文件名用，不用再手工翻译 */
const isAscii = (s) => /^[\x20-\x7e]+$/.test(String(s ?? '').trim());

const AVATAR_COLORS = ['#f093fb', '#5b8ff9', '#5ad8a6', '#f6bd16', '#e8684a', '#9270ca'];
const avatarColor = (name) =>
  AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

export default function SongImportModal({ open, onClose, courseId, categories, onSaved }) {
  const singers = courseId === 'EnglishSongs' ? ENGLISH_SINGERS : CHINESE_SINGERS;

  const [singer, setSinger] = useState('');
  const [items, setItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  // 预览（看歌词 + 试听）
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 保存：选好歌先拉详情拿音源和歌词，再让用户确认分类/英文名
  const [target, setTarget] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [category, setCategory] = useState('');
  const [en, setEn] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const doSearch = async (name) => {
    setSinger(name);
    setSearching(true);
    setError(null);
    const res = await window.api.songsSearch(name);
    setSearching(false);
    if (!res.ok) {
      setError(res.error);
      setItems([]);
      return;
    }
    setItems(res.data ?? []);
    if ((res.data ?? []).length === 0) setError('没搜到，换个名字试试');
  };

  const loadDetail = async (song, setter, loadingSetter) => {
    loadingSetter(true);
    const res = await window.api.songsDetail(song.id);
    loadingSetter(false);
    if (!res.ok) {
      message.error(`取详情失败：${res.error}`);
      return null;
    }
    setter({ ...res.data, title: res.data.title || song.title, artist: res.data.artist || song.artist });
    return res.data;
  };

  const handlePreview = (song) => {
    setPreview(song);
    loadDetail(song, setPreview, setPreviewLoading);
  };

  const handlePick = async (song) => {
    setTarget(song);
    setResult(null);
    setCategory((prev) => prev || categories[0] || '');
    // 英文歌名本身就是 ASCII，可直接当文件名；中文歌名不行，留空让用户填
    setEn(isAscii(song.title) ? song.title : '');
    await loadDetail(song, setDetail, setDetailLoading);
  };

  const handleSave = async () => {
    if (!target || !detail) return;
    const name = String(en).trim();
    if (!name) {
      message.error('英文名不能为空 —— 文件名由它生成，必须是英文');
      return;
    }
    if (!detail.audioUrl) {
      message.error(`这首歌没有在线音源（${detail.audioCode}：${detail.audioMsg}）`);
      return;
    }

    setSaving(true);
    const res = await window.api.songsImport({
      courseId,
      category,
      name: target.title,
      en: name,
      audioUrl: detail.audioUrl,
      lrc: detail.lrc,
    });
    setSaving(false);

    if (!res.ok) {
      setResult({ ok: false, text: res.error });
      return;
    }
    setResult({
      ok: true,
      text: `已保存：${res.data.audioName}${res.data.wroteLrc ? ` + ${res.data.lyricName}` : ''}（${Math.round(res.data.audioBytes / 1024)} KB）`,
    });
    onSaved?.();
  };

  const closeAll = () => {
    setItems([]);
    setError(null);
    setSinger('');
    setPreview(null);
    setTarget(null);
    setDetail(null);
    setResult(null);
    onClose?.();
  };

  const columns = [
    {
      title: '歌曲',
      render: (_, song) => (
        <div>
          <div style={{ fontWeight: 500 }}>{song.title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            #{song.id}
          </Text>
        </div>
      ),
    },
    {
      title: '歌手',
      width: 140,
      render: (_, song) => song.artist || <Tag>未知</Tag>,
    },
    {
      title: '操作',
      width: 150,
      render: (_, song) => (
        <Space size={4}>
          <Button size="small" onClick={() => handlePreview(song)}>
            预览
          </Button>
          <Button size="small" type="primary" onClick={() => handlePick(song)}>
            导入
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal open={open} title="从网上导入歌曲" onCancel={closeAll} width={900} footer={null}>
      {/* 歌手快捷卡片 */}
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          热门歌手（点一下就搜）
        </Text>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
            gap: 8,
            marginTop: 8,
            maxHeight: 150,
            overflowY: 'auto',
          }}
        >
          {singers.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => doSearch(name)}
              style={{
                border: singer === name ? '2px solid #1677ff' : '1px solid #e8e8e8',
                background: singer === name ? '#f0f7ff' : '#fff',
                borderRadius: 8,
                padding: '6px 4px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: avatarColor(name),
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                {name.slice(0, 1)}
              </div>
              <span style={{ fontSize: 12 }}>{name}</span>
            </button>
          ))}
        </div>
      </div>

      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder="歌手名或歌名"
          value={singer}
          onChange={(e) => setSinger(e.target.value)}
          onPressEnter={() => doSearch(singer)}
          style={{ width: 220 }}
        />
        <Button type="primary" loading={searching} onClick={() => doSearch(singer)}>
          搜索
        </Button>
      </Space>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

      <Table
        rowKey="id"
        size="small"
        loading={searching}
        columns={columns}
        dataSource={items}
        pagination={false}
        scroll={{ y: 260 }}
        locale={{ emptyText: '搜一下就有结果了' }}
      />

      {/* 预览歌词 + 试听 */}
      <Modal
        open={Boolean(preview)}
        title={preview?.title}
        onCancel={() => setPreview(null)}
        footer={null}
        width={520}
      >
        {previewLoading ? (
          <Spin />
        ) : (
          <div>
            {preview?.audioUrl ? (
              <audio controls src={preview.audioUrl} style={{ width: '100%', marginBottom: 12 }} />
            ) : (
              <Alert
                type="warning"
                showIcon
                message="这首歌没有在线音源"
                description={`code ${preview?.audioCode ?? '-'}：${preview?.audioMsg ?? ''}`}
                style={{ marginBottom: 12 }}
              />
            )}
            <pre
              style={{
                maxHeight: 260,
                overflow: 'auto',
                background: '#fafafa',
                padding: 8,
                borderRadius: 4,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
              }}
            >
              {preview?.plainLyrics || '（没有歌词）'}
            </pre>
          </div>
        )}
      </Modal>

      {/* 保存表单 */}
      <Modal
        open={Boolean(target)}
        title={`导入「${target?.title ?? ''}」`}
        onCancel={() => setTarget(null)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ disabled: !detail?.audioUrl }}
      >
        <div style={{ marginTop: 16 }}>
          {detailLoading ? (
            <Spin tip="取音源和歌词…" />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>分类</div>
                <Select
                  value={category}
                  onChange={setCategory}
                  style={{ width: '100%' }}
                  options={categories.map((c) => ({ value: c, label: c }))}
                  placeholder="选一个分类"
                />
              </div>
              <div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  English（决定文件名，必须是英文）
                </div>
                <Input value={en} onChange={(e) => setEn(e.target.value)} placeholder="Clear Sky" />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  中文名：{target?.title} ·{' '}
                  {detail?.audioUrl ? (
                    <Tag color="green">有音源</Tag>
                  ) : (
                    <Tag color="red">无音源（{detail?.audioCode}）</Tag>
                  )}
                  {detail?.lrc ? <Tag color="blue">有歌词</Tag> : <Tag>无歌词</Tag>}
                </Text>
              </div>
              {result && (
                <Alert
                  type={result.ok ? 'success' : 'error'}
                  showIcon
                  message={result.text}
                />
              )}
            </Space>
          )}
        </div>
      </Modal>
    </Modal>
  );
}
