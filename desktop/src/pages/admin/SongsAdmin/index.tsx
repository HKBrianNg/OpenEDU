// desktop/src/pages/admin/SongsAdmin/index.tsx

import { useCallback, useEffect, useState, useMemo } from 'react';
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
  App,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SONG_CATEGORY } from '../../music/shared/categories';
import { SongImportModal } from './components/SongImportModal';
import { useLocale } from '../../../store/LocaleContext';
import type { CourseId, SongRow } from './songTypes';

const { Text } = Typography;

export function SongsAdmin() {
  const { t } = useLocale();
  const { message: messageApi, modal: modalApi } = App.useApp();

  const courses = useMemo(
    () => [
      { value: 'ChineseSongs' as CourseId, label: t('Songs.courseZh') },
      { value: 'EnglishSongs' as CourseId, label: t('Songs.courseEn') },
    ],
    [t],
  );

  const [courseId, setCourseId] = useState<CourseId>('ChineseSongs');
  const [rows, setRows] = useState<SongRow[]>([]);
  const [orphans, setOrphans] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm<{
    category: string;
    name: string;
    english: string;
    artist: string;
  }>();
  const [audioPath, setAudioPath] = useState('');
  const [lyricPath, setLyricPath] = useState('');
  const [saving, setSaving] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SongRow | null>(null);
  const [editForm] = Form.useForm<{
    category: string;
    name: string;
    english: string;
    artist: string;
  }>();
  const [editAudioPath, setEditAudioPath] = useState('');
  const [editLyricPath, setEditLyricPath] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // 主列表按歌手筛选；选项来自当前课程曲库（中文曲→中文歌手，英文曲→英文歌手）
  const [filterSinger, setFilterSinger] = useState<string | undefined>(undefined);
  // 主列表按分类筛选（儿歌 / 流行歌曲）
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);

  const [importOpen, setImportOpen] = useState(false);

  // ─── 加载 ──────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.ipcRenderer?.invoke('songs:load', courseId);
      if (!res?.ok) {
        setError(res?.error || '加载失败');
        setRows([]);
        setOrphans([]);
        setCategories([]);
      } else {
        setRows(res.data?.rows ?? []);
        setOrphans(res.data?.orphans ?? []);
        setCategories(res.data?.categories ?? []);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── 选文件 ────────────────────────────────────────────

  const pick = async (kind: 'audio' | 'lyric', setter: (p: string) => void) => {
    const p = await window.ipcRenderer?.invoke('dialog:pick-file', { kind });
    if (p) setter(p);
  };

  // ─── 添加 ──────────────────────────────────────────────

  const handleAdd = async () => {
    let values: { category: string; name: string; english: string; artist: string };
    try {
      values = await addForm.validateFields();
    } catch {
      return;
    }
    if (!audioPath) {
      messageApi.error(t('Songs.audioRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await window.ipcRenderer?.invoke('songs:add', {
        courseId,
        ...values,
        audioSrc: audioPath,
        lyricSrc: lyricPath,
      });
      if (!res?.ok) {
        messageApi.error(`${t('Songs.addFailed')}：${res?.error}`);
      } else {
        messageApi.success(
          `${t('Songs.added')}：${res.data?.item?.name}（${res.data?.audioName}）`,
        );
        setAddModalOpen(false);
        addForm.resetFields();
        setAudioPath('');
        setLyricPath('');
        load();
      }
    } catch (err: any) {
      messageApi.error(`${t('Songs.addFailed')}：${err?.message || err}`);
    }
    setSaving(false);
  };

  // ─── 删除 ──────────────────────────────────────────────

  const handleRemove = (row: SongRow) => {
    modalApi.confirm({
      title: `${t('Songs.delete')}「${row.name}」？`,
      content: t('Songs.confirmContent'),
      okText: t('Songs.deleteEntry'),
      okButtonProps: { danger: true },
      cancelText: t('Songs.cancel'),
      onOk: async () => {
        try {
          const res = await window.ipcRenderer?.invoke('songs:remove', {
            courseId,
            name: row.name,
            artist: row.artist,
          });
          if (!res?.ok) {
            messageApi.error(`${t('Songs.deleteFailed')}：${res?.error}`);
            return;
          }
          messageApi.success(t('Songs.deleted'));
          load();
        } catch (err: any) {
          messageApi.error(`${t('Songs.deleteFailed')}：${err?.message || err}`);
        }
      },
    });
  };

  // ─── 编辑 ──────────────────────────────────────────────

  const handleEdit = (row: SongRow) => {
    setEditingRow(row);
    editForm.setFieldsValue({
      category: row.category,
      name: row.name,
      english: row.english,
      artist: row.artist,
    });
    setEditAudioPath('');
    setEditLyricPath('');
    setEditModalOpen(true);
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setEditingRow(null);
    setEditAudioPath('');
    setEditLyricPath('');
  };

  const handleUpdate = async () => {
    if (!editingRow) return;
    let values: { category: string; name: string; english: string; artist: string };
    try {
      values = await editForm.validateFields();
    } catch {
      return;
    }
    setEditSaving(true);
    try {
      const res = await window.ipcRenderer?.invoke('songs:update', {
        courseId,
        name: editingRow.name,
        artist: editingRow.artist,
        updates: values,
        audioSrc: editAudioPath,
        lyricSrc: editLyricPath,
      });
      if (!res?.ok) {
        messageApi.error(`${t('Songs.editFailed')}：${res?.error}`);
      } else {
        messageApi.success(t('Songs.updated'));
        handleEditClose();
        load();
      }
    } catch (err: any) {
      messageApi.error(`${t('Songs.editFailed')}：${err?.message || err}`);
    }
    setEditSaving(false);
  };

  // 当前课程曲库的歌手列表（中文曲→中文歌手，英文曲→英文歌手），供主列表按歌手筛选
  const singerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows.map((r) => (r.artist || '').trim()).filter((a) => a && a !== '未知'),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!filterCategory || r.category === filterCategory) &&
          (!filterSinger || r.artist === filterSinger),
      ),
    [rows, filterCategory, filterSinger],
  );

  // ─── 列定义 ────────────────────────────────────────────

  const columns: ColumnsType<SongRow> = [
    {
      title: t('Songs.colCategory'),
      dataIndex: 'category',
      width: 100,
    },
    {
      title: t('Songs.colName'),
      dataIndex: 'name',
      width: 160,
    },
    {
      title: 'English',
      dataIndex: 'english',
      ellipsis: true,
    },
    {
      title: t('Songs.colArtist'),
      dataIndex: 'artist',
      width: 130,
      render: (a: string) =>
        a && a !== '未知' ? (
          a
        ) : (
          <Tag color="orange">{t('Songs.noArtist')}</Tag>
        ),
    },
    {
      title: t('Songs.colAudio'),
      width: 90,
      render: (_, r: SongRow) =>
        r.audio ? (
          <Tag color="green">{t('Songs.has')}</Tag>
        ) : (
          <Tag>{t('Songs.none')}</Tag>
        ),
    },
    {
      title: t('Songs.colLyric'),
      width: 90,
      render: (_, r: SongRow) =>
        r.lyrics ? (
          <Tag color="green">{t('Songs.has')}</Tag>
        ) : (
          <Tag>{t('Songs.none')}</Tag>
        ),
    },
    {
      title: t('Songs.colActions'),
      width: 110,
      render: (_, r: SongRow) => (
        <Space size={0}>
          <Button size="small" type="link" onClick={() => handleEdit(r)}>
            {t('Songs.edit')}
          </Button>
          <Button size="small" danger type="link" onClick={() => handleRemove(r)}>
            {t('Songs.delete')}
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
          title={t('Songs.loadFailed')}
          description={error}
          style={{ marginBottom: 12 }}
        />
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <Select<CourseId>
          value={courseId}
          onChange={(v) => {
            setCourseId(v);
            setFilterSinger(undefined);
            setFilterCategory(undefined);
          }}
          style={{ width: 120 }}
          options={courses}
        />
        <Select
          value={filterCategory}
          onChange={(v) => setFilterCategory(v || undefined)}
          allowClear
          placeholder={t('Songs.filterCategory')}
          style={{ width: 140 }}
          options={Array.from(
            new Set([SONG_CATEGORY.nursery, SONG_CATEGORY.pop, ...categories]),
          ).map((c) => ({ value: c, label: c }))}
        />
        <Select
          value={filterSinger}
          onChange={(v) => setFilterSinger(v || undefined)}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t('Songs.filterSingerPlaceholder')}
          style={{ width: 180 }}
          options={singerOptions.map((a) => ({ value: a, label: a }))}
        />
        <Button onClick={load}>{t('Songs.reload')}</Button>
        <Button onClick={() => setAddModalOpen(true)}>{t('Songs.addLocal')}</Button>
        <Button type="primary" onClick={() => setImportOpen(true)}>
          {t('Songs.importOnline')}
        </Button>
      </Space>

      {orphans.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={`${orphans.length} ${t('Songs.orphansSuffix')}`}
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

      <Table<SongRow>
        rowKey={(r) => `${r.name}-${r.artist}`}
        size="small"
        loading={loading}
        columns={columns}
        dataSource={visibleRows}
        scroll={{ y: 420 }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        title={() => (
          <span>
            {t('Songs.current')}：
            {courses.find((c) => c.value === courseId)?.label ?? courseId} ·{' '}
            {filterSinger ? `${visibleRows.length} / ${rows.length}` : rows.length}{' '}
            {t('Songs.songsUnit')}
          </span>
        )}
      />

      {/* 添加本地歌曲弹窗 */}
      <Modal
        title={t('Songs.addTitle')}
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onOk={handleAdd}
        confirmLoading={saving}
        okText={t('Songs.addOk')}
        cancelText={t('Songs.cancel')}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="category"
            label={t('Songs.categoryLabel')}
            rules={[{ required: true, message: t('Songs.pickCategory') }]}
          >
            <Select
              options={Array.from(
                new Set([SONG_CATEGORY.nursery, SONG_CATEGORY.pop, ...categories]),
              ).map((c) => ({ value: c, label: c }))}
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
            name="english"
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

        <Space orientation="vertical" style={{ width: '100%' }}>
          <Space>
            <Button onClick={() => pick('audio', setAudioPath)}>
              {t('Songs.pickAudio')}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {audioPath ? audioPath.split(/[\\/]/).pop() : t('Songs.notSelectedRequired')}
            </Text>
          </Space>
          <Space>
            <Button onClick={() => pick('lyric', setLyricPath)}>
              {t('Songs.pickLyric')}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {lyricPath ? lyricPath.split(/[\\/]/).pop() : t('Songs.notSelectedOptional')}
            </Text>
          </Space>
        </Space>

        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
          {t('Songs.copyNote')}
        </Text>
      </Modal>

      {/* 编辑歌曲弹窗 */}
      <Modal
        title={t('Songs.editTitle')}
        open={editModalOpen}
        onCancel={handleEditClose}
        onOk={handleUpdate}
        confirmLoading={editSaving}
        okText={t('Songs.editOk')}
        cancelText={t('Songs.cancel')}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="category"
            label={t('Songs.categoryLabel')}
            rules={[{ required: true, message: t('Songs.pickCategory') }]}
          >
            <Select
              options={Array.from(
                new Set([SONG_CATEGORY.nursery, SONG_CATEGORY.pop, ...categories]),
              ).map((c) => ({ value: c, label: c }))}
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
            <Input />
          </Form.Item>
          <Form.Item
            name="english"
            label={t('Songs.enLabel')}
            rules={[{ required: true, message: t('Songs.fillEn') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="artist"
            label={t('Songs.artistLabel')}
            rules={[{ required: true, message: t('Songs.fillArtist') }]}
          >
            <Input placeholder={t('Songs.artistPlaceholder')} />
          </Form.Item>
        </Form>

        <Space orientation="vertical" style={{ width: '100%' }}>
          <Space>
            <Button onClick={() => pick('audio', setEditAudioPath)}>
              {t('Songs.pickAudio')}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {editAudioPath
                ? editAudioPath.split(/[\\/]/).pop()
                : `${t('Songs.currentAudio')}：${editingRow?.audioName || t('Songs.none')}`}
            </Text>
          </Space>
          <Space>
            <Button onClick={() => pick('lyric', setEditLyricPath)}>
              {t('Songs.pickLyric')}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {editLyricPath
                ? editLyricPath.split(/[\\/]/).pop()
                : `${t('Songs.currentLyric')}：${editingRow?.lyricName || t('Songs.none')}`}
            </Text>
          </Space>
        </Space>

        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
          {t('Songs.editNote')}
        </Text>
      </Modal>

      {/* 在线导入弹窗 */}
      <SongImportModal
        open={importOpen}
        courseId={courseId}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />
    </div>
  );
}