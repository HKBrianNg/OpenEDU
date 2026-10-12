// 歌曲播放器弹窗（中/英文歌曲共用）
//
// 功能：播放/暂停/继续/停止、可点击进度条、音量调节、
//       歌词同步高亮 + 自动滚动 + 点击歌词行跳转播放

import React, { useEffect, useMemo, useRef } from 'react';
import { Button, Modal, Slider, Space } from 'antd';
import { useLocale } from '../../store/LocaleContext';
import type { SongItem } from './types';
import { useAudioPlayer } from './useAudioPlayer';
import { useLyrics } from './useLyrics';

interface SongPlayerModalProps {
  open: boolean;
  song: SongItem | null;
  /** 已解析的音频地址，空串表示该歌曲无音频 */
  audioUrl: string;
  /** 已解析的歌词地址，空串表示无歌词 */
  lyricUrl: string;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

const SongPlayerModal: React.FC<SongPlayerModalProps> = ({
  open,
  song,
  audioUrl,
  lyricUrl,
  onClose,
}) => {
  const { t } = useLocale();
  const player = useAudioPlayer();
  const { lines: lyrics, loading: lyricsLoading } = useLyrics(
    open && song ? lyricUrl || undefined : undefined
  );

  const canPlay = !!audioUrl;

  // 切歌或关闭弹窗时停止上一首（songKey 以歌名区分不同歌曲）
  const songKey = song?.name ?? '';
  useEffect(() => {
    player.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songKey, open]);

  // ── 当前歌词行索引（倒序找第一个时间戳 <= currentTime 的行）──
  const activeIndex = useMemo(() => {
    if (!player.isPlaying && player.currentTime === 0) return -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (player.currentTime >= lyrics[i].time) return i;
    }
    return -1;
  }, [player.currentTime, player.isPlaying, lyrics]);

  // ── 歌词自动滚动到当前行 ──
  const lyricContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeIndex < 0) return;
    const activeEl = lyricContainerRef.current?.querySelector('.lyric-active');
    activeEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  // ── 播放/暂停/继续三态切换 ──
  const togglePlay = () => {
    if (player.isPlaying) {
      player.pause();
    } else if (player.hasAudio && player.currentTime > 0) {
      player.resume();
    } else {
      player.play(audioUrl);
    }
  };

  const toggleLabel = player.isPlaying
    ? t('music.pauseBtn')
    : player.hasAudio && player.currentTime > 0
      ? t('music.resumeBtn')
      : t('music.playBtn');

  // ── 点击进度条任意位置跳转 ──
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!player.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    player.seek(ratio * player.duration);
  };

  return (
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
          <span style={{ whiteSpace: 'nowrap' }}>{song?.name || t('music.player')}</span>
          {song && canPlay && (
            <Space size="small">
              <Button
                size="small"
                type={player.isPlaying ? 'default' : 'primary'}
                onClick={togglePlay}
              >
                {toggleLabel}
              </Button>
              {player.hasAudio && (
                <Button size="small" onClick={player.stop}>
                  {t('music.stopBtn')}
                </Button>
              )}
            </Space>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnHidden
    >
      {song ? (
        <div style={{ paddingRight: 6 }}>
          {/* ── 进度条（可点击跳转）+ 音量 ── */}
          {canPlay && (
            <div
              style={{
                marginBottom: 12,
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#888', minWidth: 35 }}>
                  {formatTime(player.currentTime)}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: '#e8e8e8',
                    borderRadius: 3,
                    position: 'relative',
                    cursor: player.duration > 0 ? 'pointer' : 'default',
                  }}
                  onClick={handleProgressClick}
                >
                  <div
                    style={{
                      width: `${player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0}%`,
                      height: '100%',
                      background: '#1677ff',
                      borderRadius: 3,
                      transition: 'width 0.3s linear',
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, color: '#888', minWidth: 35 }}>
                  {formatTime(player.duration)}
                </span>
              </div>
              {/* 音量 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <span style={{ fontSize: 12, color: '#888' }}>🔊</span>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={player.volume}
                  onChange={(v) => player.setVolume(typeof v === 'number' ? v : v[0])}
                  tooltip={{ formatter: (v) => `${Math.round((v ?? 0) * 100)}%` }}
                  style={{ width: 90, margin: 0 }}
                />
              </div>
            </div>
          )}

          {/* ── 歌词区域：独立滚动 ── */}
          {lyrics.length > 0 ? (
            <div
              ref={lyricContainerRef}
              style={{ padding: '8px 0', maxHeight: '60vh', overflowY: 'auto' }}
            >
              {lyrics.map((line, index) => {
                const active = index === activeIndex;
                return (
                  <div
                    key={index}
                    className={active ? 'lyric-active' : ''}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: active ? '#e6f4ff' : 'transparent',
                      borderRadius: 4,
                      transition: 'all 0.3s ease',
                      textAlign: 'center',
                      cursor: player.hasAudio ? 'pointer' : 'default',
                    }}
                    onClick={() => player.seek(line.time)}
                  >
                    <div
                      style={{
                        fontSize: active ? 17 : 14,
                        fontWeight: active ? 600 : 400,
                        color: active ? '#1677ff' : '#333',
                        lineHeight: 1.8,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {line.text || line.textZh}
                      {line.text && line.textZh && (
                        <span
                          style={{ color: active ? '#4096ff' : '#999', marginLeft: 8 }}
                        >
                          / {line.textZh}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              {lyricsLoading ? t('music.lyricLoading') : t('music.noLyric')}
            </div>
          )}

          {/* ── 歌曲信息 ── */}
          <div
            style={{
              marginTop: 12,
              padding: '12px 0',
              borderTop: '1px solid #f0f0f0',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 500, color: '#222', marginBottom: 4 }}>
              {song.name}
            </div>
            <div style={{ fontSize: 14, color: '#555' }}>{song.en}</div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>
          {t('music.noContent')}
        </div>
      )}
    </Modal>
  );
};

export default SongPlayerModal;
