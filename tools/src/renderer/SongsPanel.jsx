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
import { useI18n } from './LocaleProvider';

const { Text } = Typography;

export default function SongsPanel({ dataRoot }) {
  const { t } = useI18n();

  // 必须是 value/label。写成 key/label 的话 rc-select 取不到 value
  // （它只认 fieldNames.value，没有 key 兜底），onChange 会收到 undefined，
  // 结果切课没反应、后端收到一个不存在的课程 id。
  const courses = [
    { value: 'ChineseSongs', label: t('Songs.courseZh') },
    { value: 'EnglishSongs', label: t('Songs.courseEn') },
  ];
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
      message.error(t('Songs.audioRequired'));
      return;
    }
    setSaving(true);
    const res = await window.api.songsAdd({ courseId, ...values, audioSrc: audioPath, lyricSrc: lyricPath });
    setSaving(false);
    if (!res.ok) {
      message.error(`${t('Songs.addFailed')}：${res.error}`);
      return;
    }
    message.success(`${t('Songs.added')}：${res.data.item.name}（${res.data.audioName}）`);
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
        text: `${t('Songs.purgeFailed')}：${purged?.results?.[0]?.error ?? res.error ?? t('Songs.unknownError')}`,
      });
      return;
    }
    const probeRes = await window.api.cdnProbe(rel);
    const after = probeRes.data;
    setCdnBusy(false);
    if (!probeRes.ok || !after?.ok) {
      setCdnInfo({
        ok: false,
        text: `${t('Songs.purgeProbeFailed')}（HTTP ${after?.status ?? probeRes.error ?? '-'}）`,
      });
      return;
    }
    const same = after.count === rows.length;
    setCdnInfo({
      ok: same,
      text: same
        ? `${t('Songs.purgeOk')}：${t('Songs.purgeOnlineCount')} ${after.count} ${t('Songs.purgeSame')}`
        : `${t('Songs.purgeMismatch')}：${t('Songs.purgeOnlineCount')} ${after.count} / ${t('Songs.purgeLocalCount')} ${rows.length} ${t('Songs.purgeHint')}`,
    });
  };

  const handleRemove = (row) => {
    Modal.confirm({
      title: `${t('Songs.delete')}「${row.name}」？`,
      content: t('Songs.confirmContent'),
      okText: t('Songs.deleteEntry'),
      okButtonProps: { danger: true },
      cancelText: t('Common.cancel'),
      onOk: async () => {
        const res = await window.api.songsRemove({ courseId, key: row.key });
        if (!res.ok) {
          message.error(`${t('Songs.deleteFailed')}：${res.error}`);
          return;
        }
        message.success(t('Songs.deleted'));
        load();
      },
    });
  };

  const columns = [
    { title: t('Songs.colCategory'), dataIndex: 'category', width: 100 },
    { title: t('Songs.colName'), dataIndex: 'name', width: 160 },
    { title: 'English', dataIndex: 'en', ellipsis: true },
    {
      title: t('Songs.colArtist'),
      dataIndex: 'artist',
      width: 130,
      // 空着的、或者导入时源站没给只好写「未知」的，都标出来好补
      render: (a) => (a && a !== '未知' ? a : <Tag color="orange">{t('Songs.noArtist')}</Tag>),
    },
    {
      title: t('Songs.colAudio'),
      width: 90,
      render: (_, r) =>
        !r.audio ? (
          <Tag>{t('Songs.none')}</Tag>
        ) : r.audioExists ? (
          <Tag color="green">{t('Songs.has')}</Tag>
        ) : (
          <Tag color="red">{t('Songs.fileMissing')}</Tag>
        ),
    },
    {
      title: t('Songs.colLyric'),
      width: 90,
      render: (_, r) =>
        !r.lyric ? (
          <Tag>{t('Songs.none')}</Tag>
        ) : r.lyricExists ? (
          <Tag color="green">{t('Songs.has')}</Tag>
        ) : (
          <Tag color="red">{t('Songs.fileMissing')}</Tag>
        ),
    },
    {
      title: t('Songs.colActions'),
      width: 70,
      render: (_, r) => (
        <Button size="small" danger type="link" onClick={() => handleRemove(r)}>
          {t('Songs.delete')}
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
          message={t('Songs.loadFailed')}
          description={error}
          style={{ marginBottom: 12 }}
        />
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          value={courseId}
          onChange={setCourseId}
          style={{ width: 120 }}
          options={courses}
        />
        <Button onClick={load}>{t('Songs.reload')}</Button>
        <Button onClick={() => setModalOpen(true)}>{t('Songs.addLocal')}</Button>
        <Button type="primary" onClick={() => setImportOpen(true)}>
          {t('Songs.importOnline')}
        </Button>
        <Button loading={cdnBusy} onClick={purgeCdn}>
          {t('Songs.purgeCdn')}
        </Button>
      </Space>

      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('Songs.cdnNote')}
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
          message={`${orphans.length} ${t('Songs.orphansSuffix')}`}
          description={
            <span>
              {orphans.slice(0, 8).join('、')}
              {orphans.length > 8 ? ' …' : ''}
              <br />
              {t('Songs.orphanHint')}
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
            {t('Songs.current')}：{courses.find((c) => c.value === courseId)?.label ?? courseId} ·{' '}
            {rows.length} {t('Songs.songsUnit')}
          </span>
        )}
      />

      <Modal
        title={t('Songs.addTitle')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAdd}
        confirmLoading={saving}
        okText={t('Songs.addOk')}
        cancelText={t('Common.cancel')}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="category"
            label={t('Songs.categoryLabel')}
            rules={[{ required: true, message: t('Songs.pickCategory') }]}
          >
            <Select
              options={categories.map((c) => ({ value: c, label: c }))}
              placeholder={t('Songs.categoryPlaceholder')}
              showSearch
              allowClear={false}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label={t('Songs.nameLabel')}
            rules={[{ required: true, message: t('Songs.fillName') }]}
          >
            <Input placeholder="勇气大爆发" />
          </Form.Item>
          <Form.Item
            name="en"
            label={t('Songs.enLabel')}
            rules={[{ required: true, message: t('Songs.fillEn') }]}
          >
            <Input placeholder="Courage Explosion" />
          </Form.Item>
          <Form.Item
            name="artist"
            label={t('Songs.artistLabel')}
            rules={[{ required: true, message: t('Songs.fillArtist') }]}
          >
            <Input placeholder={t('Songs.artistPlaceholder')} />
          </Form.Item>
        </Form>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Button onClick={() => pick('audio', setAudioPath)}>{t('Songs.pickAudio')}</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {audioPath ? audioPath.split('\\').pop() : t('Songs.notSelectedRequired')}
            </Text>
          </Space>
          <Space>
            <Button onClick={() => pick('lyric', setLyricPath)}>{t('Songs.pickLyric')}</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {lyricPath ? lyricPath.split('\\').pop() : t('Songs.notSelectedOptional')}
            </Text>
          </Space>
        </Space>

        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
          {t('Songs.copyNote')}
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
