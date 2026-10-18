// client/src/dashboard/SongAdmin/components/SongImportModal.tsx
//
// 「导入歌曲」弹窗：输入歌手名 → 从 gequhai.com 搜出歌曲列表 → 预览歌词。
//
// 注意：「真正导入到目录」尚未开放 —— data.json 只存路径，mp3/lrc 文件还要落到
// img-library 才能在 CDN 上播放，落盘方案定下来后再补写入逻辑。

import React, { useState } from 'react';
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
} from 'antd';
import type { TableProps } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useLocale } from '../../../store/LocaleContext';
import { useGequhaiSearch, useGequhaiSongDetail } from '../hooks/useGequhaiImport';
import type { GequhaiSong } from '../hooks/useGequhaiImport';

const K = (key: string) => `Dashboard.SongAdmin.${key}`;

/** 与 SongAdmin.tsx 的 slugifyForFilename 保持一致，仅用于保存弹窗里的文件名预览 */
function previewSlug(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

/**
 * 热门歌手快捷入口（全部经过实测：在 gequhai 上都能搜到结果）。
 * 卡片只存名字，不发请求 —— 点一下才触发搜索，避免打开弹窗就打 22 个请求。
 */
const POPULAR_SINGERS = [
  // 男歌手
  '周杰伦', '林俊杰', '陈奕迅', '王力宏', '张学友', '刘德华',
  '李荣浩', '薛之谦', '毛不易', '周深', '华晨宇',
  '周华健', '任贤齐', '张信哲',
  // 女歌手
  '邓紫棋', '孙燕姿', '蔡依林', '张惠妹', '王菲', '那英', '张碧晨',
  // 乐队
  '五月天',
];

const AVATAR_COLORS = [
  '#f093fb', '#5b8ff9', '#5ad8a6', '#f6bd16',
  '#e8684a', '#9270ca', '#6dc8ec', '#ff9d4d',
];

/** 由名字散列取一个稳定的头像底色 */
const avatarColor = (name: string) =>
  AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

interface SongImportModalProps {
  open: boolean;
  onClose: () => void;
  /** 目标课程（ChineseSongs / EnglishSongs） */
  courseId: string;
  /** 该课程现有分类名，供保存时选择 */
  categories: string[];
  /** 保存成功后回调，父组件可据此刷新/提示 */
  onSaved?: () => void;
}

const SongImportModal: React.FC<SongImportModalProps> = ({
  open,
  onClose,
  courseId,
  categories,
  onSaved,
}) => {
  const { t } = useLocale();

  const [singer, setSinger] = useState('');
  const { items, searching, error, search, reset } = useGequhaiSearch();
  const {
    detail,
    loading: lyricLoading,
    error: lyricError,
    load: loadLyric,
    clear: clearLyric,
  } = useGequhaiSongDetail();

  const [lyricOpen, setLyricOpen] = useState(false);

  // ── 保存到本地 ──
  // 走 Vite dev 中间件（/__local/save-song）：浏览器不能写本地文件，
  // 该接口只在 npm run dev 下存在，生产构建里不存在。
  const [saveTarget, setSaveTarget] = useState<GequhaiSong | null>(null);
  const [saveEn, setSaveEn] = useState('');
  const [saveCategory, setSaveCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; text: string } | null>(null);
  // 独立实例：与歌词预览各存一份，互不干扰
  const saveDetail = useGequhaiSongDetail();

  const openSave = (song: GequhaiSong) => {
    setSaveTarget(song);
    setSaveEn('');
    setSaveResult(null);
    // 记住上次选的分类，首次用第一个
    setSaveCategory((prev) => prev || categories[0] || '');
    void saveDetail.load(song);
  };

  const closeSave = () => {
    setSaveTarget(null);
    setSaveResult(null);
    saveDetail.clear();
  };

  const doSave = async () => {
    if (!saveTarget || !saveDetail.detail) return;
    const en = saveEn.trim();
    if (!en) {
      setSaveResult({ ok: false, text: t(K('importSaveEnRequired')) });
      return;
    }

    setSaving(true);
    setSaveResult(null);
    try {
      // 注意：必须用相对路径的裸 fetch，不能走 api.post ——
      // api.post 会拼上 VITE_API_BASE_URL（worker:8787），而该接口由 Vite dev server 提供
      const res = await fetch('/__local/save-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          category: saveCategory,
          name: saveTarget.title,
          en,
          audioUrl: saveDetail.detail.audioUrl,
          lrc: saveDetail.detail.lrc,
        }),
      });
      // 响应可能不是我们的 JSON（如打到错误页面），res.json() 要容错
      const out = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        slug?: string;
        error?: string;
      };

      if (res.ok && out.ok) {
        setSaveResult({ ok: true, text: `${t(K('importSaveSuccess'))} — ${out.slug}` });
        onSaved?.();
      } else {
        // 失败时尽量带上具体原因；拿不到就退回 HTTP 状态码，避免只显示笼统的失败
        setSaveResult({
          ok: false,
          text: `${t(K('importSaveFailed'))} — ${out.error || `HTTP ${res.status}`}`,
        });
      }
    } catch (e) {
      setSaveResult({ ok: false, text: `${t(K('importSaveFailed'))} — ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = () => {
    void search(singer);
  };

  // 点歌手卡片：填入名字并立刻搜索
  const handlePickSinger = (name: string) => {
    setSinger(name);
    void search(name);
  };

  const handlePreview = (song: GequhaiSong) => {
    setLyricOpen(true);
    void loadLyric(song);
  };

  const handleCloseLyric = () => {
    setLyricOpen(false);
    clearLyric();
  };

  const handleCloseAll = () => {
    handleCloseLyric();
    closeSave();
    setSinger('');
    reset();
    onClose();
  };

  const columns: TableProps<GequhaiSong>['columns'] = [
    {
      title: t(K('importColSong')),
      render: (_, song) => (
        <div>
          <div style={{ fontWeight: 500 }}>{song.title}</div>
          <div style={{ fontSize: 12, color: '#999' }}>#{song.id}</div>
        </div>
      ),
    },
    {
      title: t(K('importColArtist')),
      width: 160,
      render: (_, song) => song.artist || <Tag>{t(K('none'))}</Tag>,
    },
    {
      title: t(K('importColActions')),
      width: 180,
      render: (_, song) => (
        <Space size={4}>
          <Button size="small" onClick={() => handlePreview(song)}>
            {t(K('importPreview'))}
          </Button>
          <Button size="small" type="primary" onClick={() => openSave(song)}>
            {t(K('importSave'))}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        open={open}
        title={t(K('importModalTitle'))}
        onCancel={handleCloseAll}
        width={900}
        footer={[
          <Button key="close" onClick={handleCloseAll}>
            {t(K('cancel'))}
          </Button>,
        ]}
      >
        {/* 热门歌手卡片 */}
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t(K('importPopularSingers'))}
          </Typography.Text>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 10,
              marginTop: 8,
              // 22 张卡片全展开会把弹窗撑得很高，限高后可滚动
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            {POPULAR_SINGERS.map((name) => {
              const active = singer === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handlePickSinger(name)}
                  style={{
                    border: active ? '2px solid #1677ff' : '1px solid #e8e8e8',
                    background: active ? '#f0f7ff' : '#fff',
                    borderRadius: 8,
                    padding: '10px 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: avatarColor(name),
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {[...name][0]}
                  </div>
                  <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 搜索栏 */}
        <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
          <Input
            value={singer}
            onChange={(e) => setSinger(e.target.value)}
            onPressEnter={handleSearch}
            placeholder={t(K('importSingerPlaceholder'))}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Button type="primary" loading={searching} onClick={handleSearch}>
            {t(K('importSearch'))}
          </Button>
        </Space.Compact>

        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message={t(K('importSearchFailed'))}
            description={error}
          />
        )}

        {/* 结果列表 */}
        <div style={{ maxHeight: '55vh', overflow: 'auto' }}>
          <Table<GequhaiSong>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={items}
            loading={searching}
            pagination={items.length > 10 ? { pageSize: 10 } : false}
            locale={{ emptyText: t(K('importEmptyHint')) }}
          />
        </div>

        {items.length > 0 && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t(K('importSourceHint'))}
          </Typography.Text>
        )}
      </Modal>

      {/* 歌词预览（嵌套弹窗） */}
      <Modal
        open={lyricOpen}
        title={detail ? `${detail.title} — ${detail.artist}` : t(K('importLyricTitle'))}
        onCancel={handleCloseLyric}
        width={720}
        footer={[
          <Button key="close" onClick={handleCloseLyric}>
            {t(K('cancel'))}
          </Button>,
        ]}
      >
        {lyricLoading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        )}

        {!lyricLoading && lyricError && (
          <Alert type="error" showIcon message={t(K('importLyricFailed'))} description={lyricError} />
        )}

        {!lyricLoading && !lyricError && detail && (
          <>
            {/* 试听：音频直链是酷我 CDN 的带签名临时地址，仅供后台预览，不要入库 */}
            {detail.audioUrl ? (
              <div style={{ marginBottom: 16 }}>
                <audio
                  controls
                  preload="metadata"
                  src={detail.audioUrl}
                  style={{ width: '100%' }}
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t(K('importAudioHint'))}
                </Typography.Text>
              </div>
            ) : (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={t(K('importNoAudio'))}
                description={
                  detail.audioCode
                    ? `code ${detail.audioCode}${detail.audioMsg ? ` · ${detail.audioMsg}` : ''}`
                    : undefined
                }
              />
            )}

            {detail.lrc ? (
              <pre
                style={{
                  maxHeight: '50vh',
                  overflow: 'auto',
                  background: '#fafafa',
                  padding: 12,
                  borderRadius: 6,
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {detail.lrc}
              </pre>
            ) : (
              <Alert type="info" showIcon message={t(K('importNoLrc'))} />
            )}
          </>
        )}
      </Modal>

      {/* 保存到本地（写 mp3/lrc + 更新 data.json） */}
      <Modal
        open={!!saveTarget}
        title={t(K('importSaveTitle'))}
        onCancel={closeSave}
        width={520}
        footer={[
          <Button key="cancel" onClick={closeSave}>
            {t(K('cancel'))}
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={saving}
            disabled={!saveDetail.detail || !saveCategory || !saveDetail.detail.audioUrl}
            onClick={() => void doSave()}
          >
            {t(K('importSave'))}
          </Button>,
        ]}
      >
        {saveTarget && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#888' }}>{t(K('importColSong'))}</div>
              <div style={{ fontWeight: 500 }}>
                {saveTarget.title}
                {saveTarget.artist ? ` — ${saveTarget.artist}` : ''}
              </div>
            </div>

            {/* 英文名为必填：slug 由它生成，决定最终的 ASCII 文件名 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>{t(K('importSaveEn'))} *</div>
              <Input
                value={saveEn}
                onChange={(e) => setSaveEn(e.target.value)}
                placeholder={t(K('importSaveEnPlaceholder'))}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {saveEn.trim()
                  ? `/audio/${previewSlug(saveEn)}.mp3 · /lyric/${previewSlug(saveEn)}.lrc`
                  : '—'}
              </Typography.Text>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>{t(K('importSaveCategory'))}</div>
              <Select
                value={saveCategory}
                onChange={setSaveCategory}
                style={{ width: '100%' }}
                options={categories.map((c) => ({ label: c, value: c }))}
              />
            </div>

            {saveDetail.loading && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin />
              </div>
            )}

            {!saveDetail.loading && saveDetail.error && (
              <Alert
                type="error"
                showIcon
                message={t(K('importLyricFailed'))}
                description={saveDetail.error}
              />
            )}

            {!saveDetail.loading && saveDetail.detail && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t(K('importSaveReady'))}: {t(K('tableAudio'))}{' '}
                {saveDetail.detail.audioUrl ? '✓' : '✗'} · {t(K('tableLyric'))}{' '}
                {saveDetail.detail.lrc ? '✓' : '✗'}
              </Typography.Text>
            )}

            {saveResult && (
              <Alert
                style={{ marginTop: 12 }}
                type={saveResult.ok ? 'success' : 'error'}
                showIcon
                message={saveResult.text}
              />
            )}

            <Alert
              style={{ marginTop: 12 }}
              type="info"
              showIcon
              message={t(K('importSaveHint'))}
            />
          </>
        )}
      </Modal>
    </>
  );
};

export default SongImportModal;
