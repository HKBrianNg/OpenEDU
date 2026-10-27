// 歌曲列表页（中/英文歌曲共用）
//
// 职责：拉取课程 data.json、渲染分类列表、打开 SongPlayerModal

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Collapse, Spin, Typography } from 'antd';
import { getCourseBaseUrl, getCourseDataUrl } from '../../utils/coursePath';
import { safeJsonFetch } from '../../utils/safeFetch';
import { useLocale } from '../../store/LocaleContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { SongItem, SongsData } from './types';
import SongPlayerModal from './SongPlayerModal';

const { Title, Paragraph } = Typography;

interface SongsPageProps {
  /** 课程标识，如 'ChineseSongs' / 'EnglishSongs' */
  courseId: string;
  /** 只显示这个分类（如 '儿歌' / '流行歌曲'）。不传就是整门课 */
  category?: string;
  /** 页面大标题用的 i18n 键；副标题取它的 .subtitle。不传就用 data.json 里的 title */
  titleKey?: string;
  onExit?: () => void;
}

interface LoadError {
  kind: 'http' | 'empty';
  detail?: string;
}

const SongsPage: React.FC<SongsPageProps> = ({ courseId, category, titleKey }) => {
  const { t } = useLocale();
  const isMobile = useIsMobile();

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
    /* eslint-disable react-hooks/set-state-in-effect -- courseId 是外部 prop；这里把内部 data/loading/error 状态同步到「重新加载」 */
    let cancelled = false;

    setLoading(true);
    setError(null);

    safeJsonFetch<SongsData>(getCourseDataUrl(courseId))
      .then((json) => {
        if (cancelled) return;
        const picked = (json.categories ?? []).filter((c) => !category || c?.name === category);
        if (picked.flatMap((c) => c?.items ?? []).length === 0) {
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
    /* eslint-enable react-hooks/set-state-in-effect */
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

  // ── 按歌手分组（hook 要放在各个提前 return 之前）──
  // 选了卡片才进来，所以这里按歌手排：先看到是谁唱的，再看他名下有哪些歌
  const groups = useMemo(() => {
    const map = new Map<string, SongItem[]>();
    (data?.categories ?? [])
      .filter((c) => !category || c?.name === category)
      .forEach((c) => {
        (c?.items ?? []).forEach((it) => {
          const key = String(it?.artist ?? '').trim() || t('music.unknownArtist');
          const list = map.get(key) ?? [];
          list.push(it);
          map.set(key, list);
        });
      });
    return [...map.entries()].map(([artist, list]) => ({ artist, list }));
  }, [data, category, t]);

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

  // 英文界面下卡片名已经是英文，副标题留空就不渲染
  const subtitle = titleKey ? t(`${titleKey}.subtitle`) : data.titleEn;

  // ── 主渲染 ──
  return (
    <div style={{ padding: isMobile ? 12 : 20, maxWidth: 960, margin: '0 auto' }}>
      {/* 返回音乐统一放在头部最右（固定不随页面滚动），这里不再重复放一个 */}

      <div style={{ textAlign: 'center', marginBottom: isMobile ? 20 : 32 }}>
        {/* 手机上 level 2 的标题太大，压一级 */}
        <Title level={isMobile ? 3 : 2} style={{ marginBottom: 4 }}>
          {titleKey ? t(titleKey) : data.title}
        </Title>
        {subtitle && (
          <Paragraph italic style={{ color: '#888', fontSize: isMobile ? 14 : 16, marginBottom: 0 }}>
            {subtitle}
          </Paragraph>
        )}
      </div>

      {/* ── 分类列表 ── */}
      <Collapse
        defaultActiveKey={[]}
        accordion={false}
        style={{ background: 'transparent', border: 'none' }}
        items={groups.map((group, groupIndex) => ({
          key: String(groupIndex),
          label: (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Title level={4} style={{ margin: 0, fontSize: isMobile ? 16 : undefined }}>
                {group.artist}
              </Title>
              <span style={{ color: '#888', fontSize: isMobile ? 12 : 13 }}>
                {group.list.length} {t('music.songsUnit')}
              </span>
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
                {group.list.map((item, itemIndex) => (
                  <div
                    key={`${groupIndex}-${itemIndex}-${item.name}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      // 手机上这一行是主要点击目标，行高放大一点更好按
                      padding: isMobile ? '12px 12px' : '8px 12px',
                      borderBottom:
                        itemIndex < group.list.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: isMobile ? 15 : 14 }}>
                        {item.name || t('music.emptyName')}
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? 12 : 11,
                          color: '#aaa',
                          marginTop: 2,
                        }}
                      >
                        {item.en}
                      </div>
                    </div>

                    {hasAudio(item) ? (
                      <a
                        onClick={() => handleViewSong(item)}
                        style={{
                          color: '#1677ff',
                          fontSize: isMobile ? 15 : 14,
                          flexShrink: 0,
                          marginLeft: 12,
                          // 放大点击区：手机上 14px 的文字链接很难点准
                          padding: isMobile ? '6px 4px' : 0,
                          cursor: 'pointer',
                        }}
                      >
                        {t('music.play')}
                      </a>
                    ) : (
                      <span
                        style={{
                          color: '#ccc',
                          fontSize: isMobile ? 13 : 13,
                          flexShrink: 0,
                          marginLeft: 12,
                        }}
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
