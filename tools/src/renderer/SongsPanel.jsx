// 歌曲面板：看目录（含断链/孤儿文件）→ 加歌（选本地 mp3/lrc）→ 删条目
//
// 桌面端比 Web 强的地方：能用系统文件选择框挑本地音频，直接拷进仓库。
// Web 端只能从 gequhai 抓，且只在 dev server 下能写盘。

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import SongImportModal from './SongImportModal';

const { Text } = Typography;

// 必须是 value/label。写成 key/label 的话 rc-select 取不到 value
// （它只认 fieldNames.value，没有 key 兜底），onChange 会收到 undefined，
// 结果切课没反应、后端收到一个不存在的课程 id。
const COURSES = [
  { value: 'ChineseSongs', label: '中文歌' },
  { value: 'EnglishSongs', label: '英文歌' },
];

export default function SongsPanel({ dataRoot }) {
  const [courseId, setCourseId] = useState('ChineseSongs');
  const [rows, setRows] = useState([]);
  const [orphans, setOrphans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [audioPath, setAudioPath] = useState('');
  const [lyricPath, setLyricPath] = useState('');
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [cdnBusy, setCdnBusy] = useState(false);
  const [cdnInfo, setCdnInfo] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await window.api.songsLoad(courseId);
    if (!res.ok) {
      setError(res.error);
      setRows([]);
    } else {
      setRows(res.data.rows);
      setOrphans(res.data.orphans ?? []);
      setCategories(res.data.categories ?? []);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load, dataRoot]);

  const pick = async (kind, setter) => {
    const p = await window.api.pickFile(kind);
    if (p) setter(p);
  };

  const handleAdd = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (!audioPath) {
      message.error('必须选一个音频文件');
      return;
    }
    setSaving(true);
    const res = await window.api.songsAdd({ courseId, ...values, audioSrc: audioPath, lyricSrc: lyricPath });
    setSaving(false);
    if (!res.ok) {
      message.error(`添加失败：${res.error}`);
      return;
    }
    message.success(`已添加：${res.data.item.name}（${res.data.audioName}）`);
    setModalOpen(false);
    form.resetFields();
    setAudioPath('');
    setLyricPath('');
    load();
  };

  /**
   * 清 CDN 缓存，然后立刻复查线上的 data.json。
   * 光看 purge 返回成功不算数 —— 再探一次确认线上条数跟本地对得上。
   */
  const purgeCdn = async () => {
    const rel = `openEDU/${courseId}/data.json`;
    setCdnBusy(true);
    setCdnInfo(null);
    // 注意：res 是 guard 的信封 {ok, data}，真正的结果在 res.data 里。
    // 拿 res.ok 判断会永远为真（那是信封自己的状态）。
    const res = await window.api.cdnPurge([rel]);
    const purged = res.data;
    if (!res.ok || !purged?.ok) {
      setCdnBusy(false);
      setCdnInfo({
        ok: false,
        text: `清缓存失败：${purged?.results?.[0]?.error ?? res.error ?? '未知错误'}`,
      });
      return;
    }
    const probeRes = await window.api.cdnProbe(rel);
    const after = probeRes.data;
    setCdnBusy(false);
    if (!probeRes.ok || !after?.ok) {
      setCdnInfo({
        ok: false,
        text: `清完但读不到线上数据（HTTP ${after?.status ?? probeRes.error ?? '-'}）`,
      });
      return;
    }
    const same = after.count === rows.length;
    setCdnInfo({
      ok: same,
      text: same
        ? `已生效：线上 ${after.count} 条，与本地一致`
        : `清了但条数不一致：线上 ${after.count} 条 / 本地 ${rows.length} 条（等几分钟再点一次）`,
    });
  };

  const handleRemove = (row) => {
    Modal.confirm({
      title: `删除「${row.name}」？`,
      content: '只从 data.json 里移除条目，音频和歌词文件保留（可能还被别的条目引用）。',
      okText: '删除条目',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const res = await window.api.songsRemove({ courseId, key: row.key });
        if (!res.ok) {
          message.error(`删除失败：${res.error}`);
          return;
        }
        message.success('已删除');
        load();
      },
    });
  };

  const columns = [
    { title: '分类', dataIndex: 'category', width: 100 },
    { title: '歌名', dataIndex: 'name', width: 160 },
    { title: 'English', dataIndex: 'en', ellipsis: true },
    {
      title: '音频',
      width: 90,
      render: (_, r) =>
        !r.audio ? (
          <Tag>无</Tag>
        ) : r.audioExists ? (
          <Tag color="green">有</Tag>
        ) : (
          <Tag color="red">文件缺失</Tag>
        ),
    },
    {
      title: '歌词',
      width: 90,
      render: (_, r) =>
        !r.lyric ? (
          <Tag>无</Tag>
        ) : r.lyricExists ? (
          <Tag color="green">有</Tag>
        ) : (
          <Tag color="red">文件缺失</Tag>
        ),
    },
    {
      title: '操作',
      width: 70,
      render: (_, r) => (
        <Button size="small" danger type="link" onClick={() => handleRemove(r)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <div>
      {error && (
        <Alert
          type="error"
          showIcon
          message="读取歌曲目录失败"
          description={error}
          style={{ marginBottom: 12 }}
        />
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          value={courseId}
          onChange={setCourseId}
          style={{ width: 120 }}
          options={COURSES}
        />
        <Button onClick={load}>重新读取</Button>
        <Button onClick={() => setModalOpen(true)}>添加本地文件</Button>
        <Button type="primary" onClick={() => setImportOpen(true)}>
          从网上导入
        </Button>
        <Button loading={cdnBusy} onClick={purgeCdn}>
          清 CDN 缓存
        </Button>
      </Space>

      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          前台数据走 jsDelivr（缓存 12 小时）。推完 GitHub 点「清 CDN 缓存」，前台才会更新。
          {cdnInfo && (
            <>
              {' '}
              <Tag color={cdnInfo.ok ? 'green' : 'red'} style={{ marginLeft: 4 }}>
                {cdnInfo.text}
              </Tag>
            </>
          )}
        </Text>
      </div>

      {orphans.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={`${orphans.length} 个文件没有被 data.json 引用`}
          description={
            <span>
              {orphans.slice(0, 8).join('、')}
              {orphans.length > 8 ? ' …' : ''}
              <br />
              一般是删条目后留下的，确认没用可以手工删掉。
            </span>
          }
        />
      )}

      <Table
        rowKey="key"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ y: 420 }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        title={() => (
          <span>
            当前：{COURSES.find((c) => c.value === courseId)?.label ?? courseId} · {rows.length} 首
          </span>
        )}
      />

      <Modal
        title="添加歌曲"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAdd}
        confirmLoading={saving}
        okText="添加"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="category" label="分类" rules={[{ required: true, message: '选一个分类' }]}>
            <Select
              options={categories.map((c) => ({ value: c, label: c }))}
              placeholder="选择或输入新分类"
              showSearch
              allowClear={false}
            />
          </Form.Item>
          <Form.Item name="name" label="歌名" rules={[{ required: true, message: '填歌名' }]}>
            <Input placeholder="勇气大爆发" />
          </Form.Item>
          <Form.Item name="en" label="English（决定文件名）" rules={[{ required: true, message: '填英文名' }]}>
            <Input placeholder="Courage Explosion" />
          </Form.Item>
        </Form>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Button onClick={() => pick('audio', setAudioPath)}>选音频文件</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {audioPath ? audioPath.split('\\').pop() : '未选择（必填）'}
            </Text>
          </Space>
          <Space>
            <Button onClick={() => pick('lyric', setLyricPath)}>选歌词文件</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {lyricPath ? lyricPath.split('\\').pop() : '未选择（可留空）'}
            </Text>
          </Space>
        </Space>

        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
          文件会拷进仓库的 audio/ 和 lyric/，文件名由英文名生成（只保留 ASCII，
          中文歌名在 jsDelivr 上会 404）。
        </Text>
      </Modal>

      <SongImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        courseId={courseId}
        categories={categories}
        onSaved={load}
      />
    </div>
  );
}
