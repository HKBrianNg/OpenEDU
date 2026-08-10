import React, { useState, useRef, useEffect } from 'react';
import { Card, Typography, Button, Slider } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface AudioLessonProps {
  lessonUrl: string;
  lrc?: string;
  title?: string;
}

const AudioLesson: React.FC<AudioLessonProps> = ({ lessonUrl, lrc, title }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 强制打印 lrc 内容
  console.log('[AudioLesson] Received lrc:', lrc);
  console.log('[AudioLesson] lrc length:', lrc?.length);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const onLoad = () => setDuration(audio.duration);
    const onEnd = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', onLoad);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', onLoad);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    isPlaying ? audio.pause() : audio.play();
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Card title={title || '音频课程（调试版）'} style={{ maxWidth: 640, margin: '0 auto' }}>
      <audio ref={audioRef} src={lessonUrl} preload="metadata" />

      {/* 控制栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <Button
          type="primary"
          shape="circle"
          icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          size="large"
          onClick={togglePlay}
        />
        <div style={{ flex: 1 }}>
          <Slider
            min={0}
            max={duration || 1}
            value={currentTime}
            onChange={(v) => { if (audioRef.current) audioRef.current.currentTime = v; }}
            tooltip={{ formatter: (val) => formatTime(val || 0) }}
          />
        </div>
        <Text type="secondary">{formatTime(currentTime)} / {formatTime(duration)}</Text>
      </div>

      {/* 直接显示 lrc 内容（无论什么格式） */}
      <div style={{
        padding: 16,
        background: '#f5f5f5',
        borderRadius: 8,
        fontSize: 15,
        lineHeight: 1.8,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {lrc ? (
          lrc
        ) : (
          <Text type="warning">未收到歌词内容</Text>
        )}
      </div>
    </Card>
  );
};

export default AudioLesson;