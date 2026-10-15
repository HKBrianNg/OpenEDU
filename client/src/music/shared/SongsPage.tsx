// 歌曲列表页（中/英文歌曲共用）
//
// 职责：拉取课程 data.json、渲染分类列表、打开 SongPlayerModal

import React, { useEffect, useState } from 'react';
import { Button, Card, Collapse, Spin, Typography } from 'antd';
import { getCourseBaseUrl, getCourseDataUrl } from '../../utils/coursePath';
import { safeJsonFetch } from '../../utils/safeFetch';
import { useLocale } from '../../store/LocaleContext';
import type { SongItem, SongsData } from './types';
import SongPlayerModal from './SongPlayerModal';

const { Title, Paragraph } = Typography;

interface SongsPageProps {
  /** 课程标识，如 'ChineseSongs' / 'EnglishSongs' */
  courseId: string;
  onExit?: () => void;
}

interface LoadError {
  kind: 'http' | 'empty';
  detail?: string;
}

const SongsPage: React.FC<SongsPageProps> = ({ courseId, onExit }) => {
  const { t } = useLocale();

  const [data, setData] = useState<SongsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [currentSong, setCurrentSong] = useState<SongItem | null>(null);

  // ── 资源 URL 解析 ──
  // 音频和歌词与其它课程统一走 jsdelivr（资源文件名已统一为 ASCII）
  const resolveUrl = (relativePath: string): string => {
    if (!relativePath) return '';
    if (/^https?:\/\//.test(relativePath)) return relativePath;
    const base = getCourseBaseUrl(courseId);
    return `${base}/${relativePath.replace(/^\//, '')}`;
  };

  // 数据里可能存在 '/audio/' 这种空占位路径，视为无音频
  const hasAudio = (item: SongItem): boolean => !!item.audio && item.audio !== '/audio/';

  // ── 数据加载 ──
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    safeJsonFetch<SongsData>(getCourseDataUrl(courseId))
      .then((json) => {
        if (cancelled) return;
        if (!json.categories || json.categories.length === 0) {
          setError({ kind: 'empty' });
          return;
        }
        setData(json);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError({ kind: 'http', detail: err instanceof Error ? err.message : String(err) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // ── 弹窗操作 ──
  const handleViewSong = (item: SongItem) => {
    setCurrentSong(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentSong(null);
  };

  // ── 加载状态 ──
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
        <div style={{ marginTop: 12, color: '#999' }}>{t('music.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#d93025' }}>
        <h3>{t('music.loadFailed')}</h3>
        {error.kind === 'empty' ? (
          <p style={{ color: '#555' }}>{t('music.dataEmpty')}</p>
        ) : (
          error.detail && <p style={{ color: '#888' }}>{error.detail}</p>
        )}
      </div>
    );
  }

  if (!data) return null;

  // ── 主渲染 ──
  return (
    <div style={{ padding: 20, maxWidth: 960, margin: '0 auto' }}>
      {/* 返回大厅按钮 */}
      {onExit && (
        <div style={{ marginBottom: 16 }}>
          <Button
            onClick={onExit}
            style={{
              borderRadius: 99,
              border: '1px solid #d0d0d0',
              background: '#fff',
              color: '#333',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← {t('music.backToLobby')}
          </Button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          {data.title}
        </Title>
        <Paragraph italic style={{ color: '#888', fontSize: 16, marginBottom: 0 }}>
          {data.titleEn}
        </Paragraph>
      </div>

      {/* ── 分类列表 ── */}
      <Collapse
        defaultActiveKey={[]}
        accordion={false}
        style={{ background: 'transparent', border: 'none' }}
        items={data.categories.map((category, categoryIndex) => ({
          key: String(categoryIndex),
          label: (
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {category.name}
              </Title>
              <span style={{ color: '#888', fontSize: 13 }}>{category.en}</span>
            </div>
          ),
          children: (
            <Card style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <div
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 6,
                  background: '#fff',
                  overflow: 'hidden',
                }}
              >
                {category.items.map((item, itemIndex) => (
                  <div
                    key={`${categoryIndex}-${itemIndex}-${item.name}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom:
                        itemIndex < category.items.length - 1
                          ? '1px solid #f0f0f0'
                          : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14 }}>
                        {item.name || t('music.emptyName')}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                        {item.en}
                      </div>
                    </div>

                    {hasAudio(item) ? (
                      <a
                        onClick={() => handleViewSong(item)}
                        style={{
                          color: '#1677ff',
                          fontSize: 14,
                          flexShrink: 0,
                          marginLeft: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {t('music.play')}
                      </a>
                    ) : (
                      <span
                        style={{ color: '#ccc', fontSize: 13, flexShrink: 0, marginLeft: 12 }}
                      >
                        {t('music.noAudio')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ),
        }))}
      />

      {/* ── 播放器弹窗 ── */}
      <SongPlayerModal
        open={modalOpen}
        song={currentSong}
        audioUrl={currentSong && hasAudio(currentSong) ? resolveUrl(currentSong.audio) : ''}
        lyricUrl={currentSong?.lyric ? resolveUrl(currentSong.lyric) : ''}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default SongsPage;
