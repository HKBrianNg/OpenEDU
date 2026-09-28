import React, { useEffect, useState, useRef } from 'react';
import { Card, Typography, Collapse, Modal, Spin, Button, Space } from 'antd';
import { getCourseBaseUrl, getCourseDataUrl } from '../../utils/coursePath';
import type { ChineseSongsData, SongItem } from '../ChineseSongs/types';

const { Title, Paragraph } = Typography;

const COURSE_ID = 'EnglishSongs';

// ── LRC 解析（支持 :zh 标记的双语歌词）──
interface LyricLine {
  time: number;
  textEn: string;
  textZh: string;
}

function parseLRC(lrcText: string): LyricLine[] {
  const lines = lrcText.split('\n');
  const map = new Map<number, { textEn: string; textZh: string }>();

  const regex = /^\[(\d{2}):(\d{2})\.(\d{2,3})(?::zh)?\]\s*(.*)$/;

  for (const line of lines) {
    const match = line.match(regex);
    if (!match) continue;

    const min = parseInt(match[1], 10);
    const sec = parseInt(match[2], 10);
    const ms = parseInt(match[3].padEnd(3, '0'), 10);
    const time = min * 60 + sec + ms / 1000;
    const isZh = line.includes(':zh]');
    const text = match[4].trim();

    if (!text) continue;

    const key = Number(time.toFixed(3));

    if (!map.has(key)) {
      map.set(key, { textEn: '', textZh: '' });
    }

    const entry = map.get(key)!;
    if (isZh) {
      entry.textZh = text;
    } else {
      entry.textEn = text;
    }
  }

  const result: LyricLine[] = [];
  for (const [time, entry] of map) {
    if (entry.textEn || entry.textZh) {
      result.push({ time, textEn: entry.textEn, textZh: entry.textZh });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

async function safeJsonFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `HTTP ${res.status} ${res.statusText} for ${url}. ` +
        (text ? `Response starts with: ${text.slice(0, 200)}` : '')
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(
      `Expected JSON from ${url}, but got content-type: "${contentType}". ` +
        `Body starts with: ${text.slice(0, 300)}`
    );
  }

  return (await res.json()) as T;
}

const EnglishSongs: React.FC = () => {
  const [data, setData] = useState<ChineseSongsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [currentSong, setCurrentSong] = useState<SongItem | null>(null);

  // 音频播放
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 歌词
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);

  // 歌词容器 ref，用于自动滚动
  const lyricContainerRef = useRef<HTMLDivElement>(null);

  // ── 音频控制 ──
  const playAudio = (audioUrl: string) => {
    stopAudio();

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentLyricIndex(-1);
    };

    audio.onerror = () => {
      setIsPlaying(false);
    };

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentLyricIndex(-1);
  };

  // ── 加载歌词 ──
  useEffect(() => {
    if (!currentSong?.lyric) {
      setLyrics([]);
      return;
    }

    const lyricUrl = resolveUrl(currentSong.lyric);

    fetch(lyricUrl)
      .then((res) => res.text())
      .then((text) => {
        const parsed = parseLRC(text);
        setLyrics(parsed);
      })
      .catch((err) => {
        console.error('歌词加载失败:', err);
        setLyrics([]);
      });
  }, [currentSong]);

  // ── 歌词同步高亮 ──
  useEffect(() => {
    if (lyrics.length === 0 || !isPlaying) return;

    let index = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        index = i;
        break;
      }
    }

    setCurrentLyricIndex(index);
  }, [currentTime, lyrics, isPlaying]);

  // ── 自动滚动到当前歌词 ──
  useEffect(() => {
    if (currentLyricIndex >= 0 && lyricContainerRef.current) {
      const activeEl = lyricContainerRef.current.querySelector('.lyric-active');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentLyricIndex]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ── 数据加载 ──
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);

    const dataUrl = getCourseDataUrl(COURSE_ID);

    safeJsonFetch<ChineseSongsData>(dataUrl)
      .then((json) => {
        if (cancelled) return;
        if (!json.categories || json.categories.length === 0) {
          setLoadError('数据为空或格式不匹配');
          return;
        }
        setData(json);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load data:', err);
        if (err instanceof Error) {
          setLoadError(err.message);
        } else {
          setLoadError('数据加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── 弹窗操作 ──
  const handleViewSong = (item: SongItem) => {
    setCurrentSong(item);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    stopAudio();
    setModalVisible(false);
    setCurrentSong(null);
    setLyrics([]);
    setCurrentLyricIndex(-1);
  };

  // ── 资源 URL 解析 ──
  const resolveUrl = (relativePath: string): string => {
    if (!relativePath) return '';
    if (/^https?:\/\//.test(relativePath)) return relativePath;

    const base = getCourseBaseUrl(COURSE_ID);
    const clean = relativePath.replace(/^\//, '');
    return `${base}/${clean}`;
  };

  // ── 格式化时间 ──
  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // ── 加载状态 ──
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin description="加载中..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: 24, color: '#d93025' }}>
        <h3>数据加载失败</h3>
        <p>{loadError}</p>
      </div>
    );
  }

  if (!data) return null;

  // ── 主渲染 ──
  return (
    <div style={{ padding: 20, maxWidth: 960, margin: '0 auto' }}>
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
                    key={item.name || itemIndex}
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
                      <div style={{ fontSize: 14 }}>{item.name || '(空)'}</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                        {item.en}
                      </div>
                    </div>

                    {item.audio && item.audio !== '/audio/' ? (
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
                        播放
                      </a>
                    ) : (
                      <span style={{ color: '#ccc', fontSize: 13, flexShrink: 0, marginLeft: 12 }}>
                        暂无
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
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingRight: 36,
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>
              {currentSong?.name || '播放器'}
            </span>
            {currentSong && (
              <Space size="small">
                {currentSong.audio && currentSong.audio !== '/audio/' && (
                  <Button
                    size="small"
                    type={isPlaying ? 'default' : 'primary'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPlaying) {
                        stopAudio();
                      } else {
                        playAudio(resolveUrl(currentSong.audio));
                      }
                    }}
                    disabled={!currentSong.audio}
                  >
                    {isPlaying ? '⏹ 停止' : '▶ 播放'}
                  </Button>
                )}
              </Space>
            )}
          </div>
        }
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={700}
        destroyOnHidden
      >
        {currentSong ? (
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 6 }}>
            {/* 进度条 */}
            {currentSong.audio && currentSong.audio !== '/audio/' && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 12, color: '#888', minWidth: 35 }}>
                    {formatTime(currentTime)}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      background: '#e8e8e8',
                      borderRadius: 2,
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                        height: '100%',
                        background: '#1677ff',
                        borderRadius: 2,
                        transition: 'width 0.3s linear',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: '#888', minWidth: 35 }}>
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
            )}

            {/* 歌词区域 - 同一行显示英文 / 中文 */}
            {lyrics.length > 0 ? (
              <div
                ref={lyricContainerRef}
                style={{
                  padding: '8px 0',
                  maxHeight: 450,
                  overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {lyrics.map((line, index) => (
                  <div
                    key={index}
                    className={index === currentLyricIndex ? 'lyric-active' : ''}
                    style={{
                      padding: '8px 12px',
                      backgroundColor:
                        index === currentLyricIndex ? '#e6f4ff' : 'transparent',
                      borderRadius: 4,
                      transition: 'all 0.3s ease',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = line.time;
                        setCurrentTime(line.time);
                      }
                    }}
                  >
                    <div
                      style={{
                        fontSize: index === currentLyricIndex ? 17 : 14,
                        fontWeight: index === currentLyricIndex ? 600 : 400,
                        color: index === currentLyricIndex ? '#1677ff' : '#333',
                        lineHeight: 1.8,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {line.textEn}
                      {line.textZh && (
                        <span
                          style={{
                            color: index === currentLyricIndex ? '#4096ff' : '#999',
                            marginLeft: 8,
                          }}
                        >
                          / {line.textZh}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: 40,
                  color: '#999',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {currentSong.lyric ? '歌词加载中...' : '暂无歌词'}
              </div>
            )}

            {/* 歌曲信息 */}
            <div
              style={{
                marginTop: 12,
                padding: '12px 0',
                borderTop: '1px solid #f0f0f0',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 500, color: '#222', marginBottom: 4 }}>
                {currentSong.name}
              </div>
              <div style={{ fontSize: 14, color: '#555' }}>
                {currentSong.en}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>
            无内容
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EnglishSongs;