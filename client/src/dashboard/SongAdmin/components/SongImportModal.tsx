// client/src/dashboard/SongAdmin/components/SongImportModal.tsx
//
// 「导入歌曲」弹窗：输入歌手名 → 从 gequhai.com 搜出歌曲列表 → 预览歌词。
//
// 注意：「真正导入到目录」尚未开放 —— data.json 只存路径，mp3/lrc 文件还要落到
// img-library 才能在 CDN 上播放，落盘方案定下来后再补写入逻辑。

import React, { useState } from 'react';
import { Alert, Button, Input, Modal, Space, Spin, Table, Tag, Tooltip, Typography } from 'antd';
import type { TableProps } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useLocale } from '../../../store/LocaleContext';
import { useGequhaiSearch, useGequhaiSongDetail } from '../hooks/useGequhaiImport';
import type { GequhaiSong } from '../hooks/useGequhaiImport';

const K = (key: string) => `Dashboard.SongAdmin.${key}`;

interface SongImportModalProps {
  open: boolean;
  onClose: () => void;
}

const SongImportModal: React.FC<SongImportModalProps> = ({ open, onClose }) => {
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

  const handleSearch = () => {
    void search(singer);
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
      width: 160,
      render: (_, song) => (
        <Button size="small" onClick={() => handlePreview(song)}>
          {t(K('importPreview'))}
        </Button>
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
          <Tooltip key="import" title={t(K('importPendingHint'))}>
            <Button type="primary" disabled>
              {t(K('importConfirm'))}
            </Button>
          </Tooltip>,
          <Button key="close" onClick={handleCloseAll}>
            {t(K('cancel'))}
          </Button>,
        ]}
      >
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
    </>
  );
};

export default SongImportModal;
