// 音频播放器 hook：管理 Audio 元素生命周期与播放状态
//
// 支持播放/暂停/继续/停止/拖动进度/音量，组件卸载时自动释放资源

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioPlayer {
  /** 是否有已加载的音频（正在播放或暂停中） */
  hasAudio: boolean;
  isPlaying: boolean;
  /** 当前播放位置（秒） */
  currentTime: number;
  /** 总时长（秒），metadata 加载前为 0 */
  duration: number;
  /** 音量 0-1 */
  volume: number;
  /** 从头播放一个新音频 */
  play: (url: string) => void;
  /** 暂停（保留进度） */
  pause: () => void;
  /** 从暂停处继续播放 */
  resume: () => void;
  /** 停止并复位（音频已结束时也用 play 重播，勿用 resume） */
  stop: () => void;
  /** 跳转到指定时间（秒） */
  seek: (time: number) => void;
  setVolume: (v: number) => void;
}

export function useAudioPlayer(): AudioPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [hasAudio, setHasAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);

  const destroyAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const play = useCallback(
    (url: string) => {
      destroyAudio();

      const audio = new Audio(url);
      audio.volume = volume;
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.onended = () => {
        // 播完复位到起点，按钮回到"播放"态
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audio.onerror = () => setIsPlaying(false);
      audioRef.current = audio;
      setHasAudio(true);

      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    },
    [destroyAudio, volume]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, []);

  const stop = useCallback(() => {
    destroyAudio();
    setHasAudio(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [destroyAudio]);

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const max = duration > 0 ? duration : Infinity;
      const clamped = Math.max(0, Math.min(time, max));
      audio.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [duration]
  );

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(v, 1));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  // 组件卸载时停止播放并释放资源
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    hasAudio,
    isPlaying,
    currentTime,
    duration,
    volume,
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
  };
}
