// desktop/src/pages/music/shared/SongsPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Card, Collapse, Spin, Typography } from 'antd';
import { getCourseBaseUrl, getCourseDataUrl } from '../../../utils/coursePath';
import { safeJsonFetch } from '../../../utils/safeFetch';
import { getCurrentLocale, createTranslator } from '../../../utils/locale';
import type { SongItem, SongsData, SongCategory } from './types';
import { SongPlayerModal } from './SongPlayerModal';
import musicResource from '../../../locales/music.json';

const { Title, Paragraph } = Typography;
type LocaleKey = 'zh-CN' | 'zh-TW' | 'en';

interface SongsPageProps {
  courseId: string;
  category?: string;
  titleKey?: string;
  subtitleKey?: string;
  localeResource?: Record<string, Record<LocaleKey, string>>;
  onExit?: () => void;
}

interface LoadError {
  kind: 'http' | 'empty';
  detail?: string;
}

export function SongsPage({
  courseId,
  category,
  titleKey,
  subtitleKey,
  localeResource,
}: SongsPageProps) {
  const [locale, setLocale] = useState<LocaleKey>(getCurrentLocale());

  const t = useMemo(() => {
    const res = localeResource ?? musicResource;
    return createTranslator(res);
  }, [locale, localeResource]);

  const [data, setData] = useState<SongsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [currentSong, setCurrentSong] = useState<SongItem | null>(null);

  const resolveUrl = (relativePath: string): string => {
    if (!relativePath) return '';
    if (/^https?:\/\//.test(relativePath)) return relativePath;
    const base = getCourseBaseUrl(courseId);
    return `${base}/${relativePath.replace(/^\//, '')}`;
  };

  const hasAudio = (item: SongItem): boolean => !!item.audio && item.audio !== '/audio/';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    safeJsonFetch<SongsData>(getCourseDataUrl(courseId))
      .then((json) => {
        if (cancelled) return;
        const picked = (json.categories ?? []).filter((c: SongCategory) => !category || c.name === category);
        if (picked.flatMap((c: SongCategory) => c.items ?? []).length === 0) {
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

  useEffect(() => {
    const timer = setInterval(() => {
      const now = getCurrentLocale();
      if (now !== locale) {
        setLocale(now);
      }
    }, 300);
    return () => clearInterval(timer);
  }, [locale]);

  const handleViewSong = (item: SongItem) => {
    setCurrentSong(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentSong(null);
  };

  const groups = useMemo(() => {
    const map = new Map<string, SongItem[]>();
    (data?.categories ?? [])
      .filter((c: SongCategory) => !category || c.name === category)
      .forEach((c: SongCategory) => {
        (c.items ?? []).forEach((it) => {
          const key = String(it.artist ?? '').trim() || t('music.unknownArtist');
          const list = map.get(key) ?? [];
          list.push(it);
          map.set(key, list);
        });
      });
    return [...map.entries()].map(([artist, list]) => ({ artist, list }));
  }, [data, category, t]);

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

  const subtitle = !subtitleKey
    ? data.titleEn
    : locale === 'zh-CN' || locale === 'zh-TW'
      ? t(subtitleKey)
      : '';

  return (
    <div
      style={{
        height: '100%',
        padding: '20px',
        maxWidth: 960,
        margin: '0 auto',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          {titleKey ? t(titleKey) : data.title}
        </Title>
        {subtitle && (
          <Paragraph italic style={{ color: '#888', fontSize: 16, marginBottom: 0 }}>
            {subtitle}
          </Paragraph>
        )}
      </div>

      <Collapse
        defaultActiveKey={[]}
        accordion={false}
        style={{ background: 'transparent', border: 'none' }}
        items={groups.map((group, groupIndex) => ({
          key: String(groupIndex),
          label: (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Title level={4} style={{ margin: 0 }}>
                {group.artist}
              </Title>
              <span style={{ color: '#888', fontSize: 13 }}>
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
                      padding: '8px 12px',
                      borderBottom:
                        itemIndex < group.list.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14 }}>
                        {item.name || t('music.emptyName')}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
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
                        style={{
                          color: '#ccc',
                          fontSize: 13,
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

      <SongPlayerModal
        open={modalOpen}
        song={currentSong}
        audioUrl={currentSong && hasAudio(currentSong) ? resolveUrl(currentSong.audio) : ''}
        lyricUrl={currentSong?.lyric ? resolveUrl(currentSong.lyric) : ''}
        onClose={handleCloseModal}
      />
    </div>
  );
}
