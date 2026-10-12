// client/src/dashboard/SongAdmin/SongAdmin.tsx
//
// 歌曲目录管理（admin）：
//   - 编辑源是 Supabase 里的整份 JSON 文档（与前台 data.json 形状一致）
//   - 「导出 data.json」下载后由管理员手动 commit 到 GitHub → purge CDN → 前台生效
//   - 「导出文件清单」列出被引用的相对路径，便于定期清理仓库里的孤儿 mp3/lrc
//   - 「从 CDN 导入」用线上 data.json 覆盖编辑内容（首次初始化/反向同步）

import { useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Collapse,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableProps } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useLocale } from '../../store/LocaleContext';
import { useSongData, useSaveSongData, fetchCatalogFromCDN } from './hooks/useSongAdmin';
import type { SongItem, SongsData } from '../../music/shared/types';

const { Title, Paragraph } = Typography;

const COURSES = ['ChineseSongs', 'EnglishSongs'] as const;
type CourseId = (typeof COURSES)[number];

const K = (key: string) => `Dashboard.SongAdmin.${key}`;

interface SongAdminProps {
  onExit?: () => void;
}

// 触发浏览器下载
function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SongAdmin: React.FC<SongAdminProps> = ({ onExit }) => {
  const { message, modal } = App.useApp();
  const { t } = useLocale();

  const [courseId, setCourseId] = useState<CourseId>('ChineseSongs');
  const { data, setData, loading, notFound, error, reload } = useSongData(courseId);
  const { saving, save } = useSaveSongData();

  // 未保存标记：任何编辑置 true，保存/切课后复位
  const [dirty, setDirty] = useState(false);

  const [songForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  // 歌曲弹窗：ci = 分类索引，si = null 新增 / 数字编辑
  const [songModal, setSongModal] = useState<{ ci: number; si: number | null } | null>(null);
  // 分类弹窗：ci = null 新增 / 数字编辑
  const [categoryModal, setCategoryModal] = useState<{ ci: number | null } | null>(null);

  useEffect(() => {
    setDirty(false);
  }, [courseId]);

  const courseLabel = (id: string) =>
    id === 'ChineseSongs' ? t('music.chinesesongs.title') : t('music.englishsongs.title');

  // ── 文档整体修改（data 是纯 JSON，深拷贝安全）──
  const mutate = (updater: (draft: SongsData) => void) => {
    if (!data) return;
    const next: SongsData = JSON.parse(JSON.stringify(data));
    updater(next);
    setData(next);
    setDirty(true);
  };

  const setTitleField = (field: 'title' | 'titleEn', value: string) =>
    mutate((d) => {
      d[field] = value;
    });

  // ── 分类操作 ──
  const addCategory = (name: string, en: string) =>
    mutate((d) => {
      d.categories.push({ name, en, items: [] });
    });

  const renameCategory = (ci: number, name: string, en: string) =>
    mutate((d) => {
      d.categories[ci].name = name;
      d.categories[ci].en = en;
    });

  const deleteCategory = (ci: number) =>
    mutate((d) => {
      d.categories.splice(ci, 1);
    });

  const moveCategory = (ci: number, dir: -1 | 1) =>
    mutate((d) => {
      const [removed] = d.categories.splice(ci, 1);
      d.categories.splice(ci + dir, 0, removed);
    });

  // ── 歌曲操作 ──
  const addSong = (ci: number, item: SongItem) =>
    mutate((d) => {
      d.categories[ci].items.push(item);
    });

  const editSong = (ci: number, si: number, item: SongItem) =>
    mutate((d) => {
      d.categories[ci].items[si] = item;
    });

  const deleteSong = (ci: number, si: number) =>
    mutate((d) => {
      d.categories[ci].items.splice(si, 1);
    });

  const moveSong = (ci: number, si: number, dir: -1 | 1) =>
    mutate((d) => {
      const [removed] = d.categories[ci].items.splice(si, 1);
      d.categories[ci].items.splice(si + dir, 0, removed);
    });

  // ── 工具栏动作 ──
  const switchCourse = (next: CourseId) => {
    if (dirty) {
      modal.confirm({
        title: t(K('unsavedTitle')),
        content: t(K('unsavedDescription')),
        okText: t(K('discard')),
        cancelText: t(K('cancel')),
        onOk: () => setCourseId(next),
      });
    } else {
      setCourseId(next);
    }
  };

  const handleSave = async () => {
    if (!data) return;
    const result = await save(courseId, data);
    if (result.ok) {
      message.success(result.message || t(K('saved')));
      setDirty(false);
    } else {
      message.error(result.message || t(K('saveFailed')));
    }
  };

  const handleImport = async () => {
    try {
      const imported = await fetchCatalogFromCDN(courseId);
      setData(imported);
      setDirty(true);
      message.success(t(K('imported')));
    } catch (e) {
      message.error((e as Error)?.message || t(K('importFailed')));
    }
  };

  const handleExportJson = () => {
    if (!data) return;
    downloadFile(JSON.stringify(data, null, 2), 'data.json', 'application/json');
  };

  // 收集所有被引用的相对路径（完整 URL 不在仓库里，不列），去重排序后导出
  const handleExportFileList = () => {
    if (!data) return;
    const files = new Set<string>();
    for (const category of data.categories) {
      for (const item of category.items) {
        for (const p of [item.audio, item.lyric]) {
          if (p && !/^https?:\/\//.test(p)) files.add(p.replace(/^\//, ''));
        }
      }
    }
    downloadFile(
      Array.from(files).sort().join('\n') + '\n',
      `file-list-${courseId}.txt`,
      'text/plain',
    );
    message.success(t(K('fileListExported')));
  };

  // ── 弹窗 ──
  const openAddSong = (ci: number) => {
    songForm.setFieldsValue({ name: '', en: '', audio: '', lyric: '' });
    setSongModal({ ci, si: null });
  };

  const openEditSong = (ci: number, si: number) => {
    if (!data) return;
    const item = data.categories[ci].items[si];
    songForm.setFieldsValue({ name: item.name, en: item.en, audio: item.audio, lyric: item.lyric });
    setSongModal({ ci, si });
  };

  const handleSongSubmit = async () => {
    const values = await songForm.validateFields().catch(() => null);
    if (!values || !songModal) return;
    const item: SongItem = {
      name: values.name,
      en: values.en || '',
      audio: values.audio || '',
      lyric: values.lyric || '',
    };
    if (songModal.si === null) addSong(songModal.ci, item);
    else editSong(songModal.ci, songModal.si, item);
    setSongModal(null);
  };

  const openAddCategory = () => {
    categoryForm.setFieldsValue({ name: '', en: '' });
    setCategoryModal({ ci: null });
  };

  const openEditCategory = (ci: number) => {
    if (!data) return;
    categoryForm.setFieldsValue({
      name: data.categories[ci].name,
      en: data.categories[ci].en,
    });
    setCategoryModal({ ci });
  };

  const handleCategorySubmit = async () => {
    const values = await categoryForm.validateFields().catch(() => null);
    if (!values || !categoryModal) return;
    if (categoryModal.ci === null) addCategory(values.name, values.en || '');
    else renameCategory(categoryModal.ci, values.name, values.en || '');
    setCategoryModal(null);
  };

  // ── 加载/错误/空状态 ──
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin />
      </div>
    );
  }

  if (error && !notFound) {
    return (
      <div style={{ padding: 24 }}>
        {onExit && (
          <Button onClick={onExit} style={{ marginBottom: 16 }}>
            ← {t(K('backToDashboard'))}
          </Button>
        )}
        <Alert type="error" message={t(K('fetchFailed'))} description={error} showIcon />
      </div>
    );
  }

  // 云端无记录且本地无数据时显示引导页；导入/新建后 data 有值，直接进编辑器
  if (notFound && !data) {
    return (
      <div style={{ padding: 24 }}>
        {onExit && (
          <Button onClick={onExit} style={{ marginBottom: 16 }}>
            ← {t(K('backToDashboard'))}
          </Button>
        )}
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Segmented
            value={courseId}
            onChange={(v) => setCourseId(v as CourseId)}
            options={COURSES.map((c) => ({ label: courseLabel(c), value: c }))}
            style={{ marginBottom: 16 }}
          />
          <Title level={4}>{t(K('emptyTitle'))}</Title>
          <Paragraph type="secondary">{t(K('emptyDescription'))}</Paragraph>
          <Space>
            <Popconfirm
              title={t(K('importConfirmTitle'))}
              description={t(K('importConfirmDescription'))}
              okText={t(K('confirm'))}
              cancelText={t(K('cancel'))}
              onConfirm={handleImport}
            >
              <Button type="primary" icon={<ImportOutlined />}>
                {t(K('importFromCDN'))}
              </Button>
            </Popconfirm>
            <Button
              onClick={() => {
                setData({ title: '', titleEn: '', categories: [] });
                setDirty(true);
              }}
            >
              {t(K('newDoc'))}
            </Button>
          </Space>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ── 主界面 ──
  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      {onExit && (
        <Button onClick={onExit} style={{ marginBottom: 16 }}>
          ← {t(K('backToDashboard'))}
        </Button>
      )}

      {/* 工具栏 */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Segmented
          value={courseId}
          onChange={(v) => switchCourse(v as CourseId)}
          options={COURSES.map((c) => ({ label: courseLabel(c), value: c }))}
        />
        <Button icon={<ReloadOutlined />} onClick={reload}>
          {t(K('refresh'))}
        </Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
          {t(K('save'))}
        </Button>
        <Popconfirm
          title={t(K('importConfirmTitle'))}
          description={t(K('importConfirmDescription'))}
          okText={t(K('confirm'))}
          cancelText={t(K('cancel'))}
          onConfirm={handleImport}
        >
          <Button icon={<ImportOutlined />}>{t(K('importFromCDN'))}</Button>
        </Popconfirm>
        <Button icon={<DownloadOutlined />} onClick={handleExportJson}>
          {t(K('exportJson'))}
        </Button>
        <Button icon={<FileTextOutlined />} onClick={handleExportFileList}>
          {t(K('exportFileList'))}
        </Button>
        {dirty && <Tag color="orange">{t(K('dirtyHint'))}</Tag>}
      </Space>

      {/* 页面标题 */}
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }} size="middle">
        <Input
          addonBefore={t(K('pageTitle'))}
          value={data.title}
          onChange={(e) => setTitleField('title', e.target.value)}
        />
        <Input
          addonBefore={t(K('pageTitleEn'))}
          value={data.titleEn}
          onChange={(e) => setTitleField('titleEn', e.target.value)}
        />
      </Space>

      {/* 分类列表 */}
      <Collapse
        style={{ background: 'transparent', border: 'none' }}
        items={data.categories.map((category, ci) => {
          const songCount = category.items.length;

          const columns: TableProps<SongItem>['columns'] = [
            {
              title: t(K('tableSong')),
              render: (_, item) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{item.name || t('music.emptyName')}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{item.en}</div>
                </div>
              ),
            },
            {
              title: t(K('tableAudio')),
              width: '25%',
              render: (_, item) =>
                item.audio && item.audio !== '/audio/' ? (
                  <Tag
                    color="green"
                    style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {item.audio}
                  </Tag>
                ) : (
                  <Tag>{t(K('none'))}</Tag>
                ),
            },
            {
              title: t(K('tableLyric')),
              width: '25%',
              render: (_, item) =>
                item.lyric ? (
                  <Tag style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.lyric}
                  </Tag>
                ) : (
                  <Tag>{t(K('none'))}</Tag>
                ),
            },
            {
              title: t(K('tableActions')),
              width: 240,
              render: (_, _item, si) => (
                <Space size="small">
                  <Button
                    size="small"
                    icon={<ArrowUpOutlined />}
                    disabled={si === 0}
                    onClick={() => moveSong(ci, si, -1)}
                  />
                  <Button
                    size="small"
                    icon={<ArrowDownOutlined />}
                    disabled={si === songCount - 1}
                    onClick={() => moveSong(ci, si, 1)}
                  />
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEditSong(ci, si)}>
                    {t(K('edit'))}
                  </Button>
                  <Popconfirm
                    title={t(K('deleteSongConfirmTitle'))}
                    description={t(K('deleteSongConfirmDescription')).replace(
                      '{name}',
                      category.items[si].name,
                    )}
                    okText={t(K('confirm'))}
                    cancelText={t(K('cancel'))}
                    onConfirm={() => deleteSong(ci, si)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      {t(K('delete'))}
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ];

          return {
            key: String(ci),
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>{category.name || t('music.emptyName')}</span>
                <span style={{ color: '#888', fontSize: 13 }}>{category.en}</span>
                <Tag>{songCount}</Tag>
                <Space
                  size="small"
                  style={{ marginLeft: 'auto' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button size="small" icon={<PlusOutlined />} onClick={() => openAddSong(ci)}>
                    {t(K('addSong'))}
                  </Button>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEditCategory(ci)} />
                  <Button
                    size="small"
                    icon={<ArrowUpOutlined />}
                    disabled={ci === 0}
                    onClick={() => moveCategory(ci, -1)}
                  />
                  <Button
                    size="small"
                    icon={<ArrowDownOutlined />}
                    disabled={ci === data.categories.length - 1}
                    onClick={() => moveCategory(ci, 1)}
                  />
                  <Popconfirm
                    title={t(K('deleteCategoryConfirmTitle'))}
                    description={t(K('deleteCategoryConfirmDescription'))}
                    okText={t(K('confirm'))}
                    cancelText={t(K('cancel'))}
                    onConfirm={() => deleteCategory(ci)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
            ),
            children: (
              <Table<SongItem>
                size="small"
                rowKey={(_, si) => String(si)}
                columns={columns}
                dataSource={category.items}
                pagination={false}
                locale={{ emptyText: t(K('none')) }}
              />
            ),
          };
        })}
      />

      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        onClick={openAddCategory}
        style={{ marginTop: 8 }}
      >
        {t(K('addCategory'))}
      </Button>

      {/* 歌曲弹窗 */}
      <Modal
        title={`${t(songModal?.si === null ? K('songModalAdd') : K('songModalEdit'))} · ${
          songModal ? data.categories[songModal.ci].name : ''
        }`}
        open={songModal !== null}
        onCancel={() => setSongModal(null)}
        onOk={handleSongSubmit}
        destroyOnHidden
      >
        <Form form={songForm} layout="vertical">
          <Form.Item
            name="name"
            label={t(K('songName'))}
            rules={[{ required: true, message: t(K('songNameRequired')) }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="en" label={t(K('songNameEn'))}>
            <Input />
          </Form.Item>
          <Form.Item
            name="audio"
            label={t(K('songAudio'))}
            extra={t(K('songAudioExtra'))}
            rules={[
              {
                pattern: /^\S+$/,
                message: t(K('songAudioExtra')),
              },
            ]}
          >
            <Input placeholder={t(K('songAudioPlaceholder'))} />
          </Form.Item>
          <Form.Item name="lyric" label={t(K('songLyric'))}>
            <Input placeholder={t(K('songLyricPlaceholder'))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分类弹窗 */}
      <Modal
        title={
          categoryModal?.ci === null ? t(K('categoryModalAdd')) : t(K('categoryModalEdit'))
        }
        open={categoryModal !== null}
        onCancel={() => setCategoryModal(null)}
        onOk={handleCategorySubmit}
        destroyOnHidden
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item
            name="name"
            label={t(K('categoryName'))}
            rules={[{ required: true, message: t(K('nameRequired')) }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="en" label={t(K('categoryEn'))}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SongAdmin;
