import React, { useState, useRef, useEffect } from 'react';

// 完整匹配父组件传参的Props类型
export interface AudioLessonProps {
  audioSrc: string;
  lrcPath: string;
  lessonId: string;
  title: string;
  onSaveProgress: (currentTime: number, totalDuration: number) => void;
}

const AudioLesson: React.FC<AudioLessonProps> = ({
  audioSrc,
  lrcPath,
  lessonId,
  title,
  onSaveProgress
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [lrcText, setLrcText] = useState('');

  // 加载歌词文件
  useEffect(() => {
    if (!lrcPath) return;
    const fetchLrc = async () => {
      try {
        const res = await fetch(lrcPath);
        const text = await res.text();
        setLrcText(text);
      } catch (err) {
        console.error('歌词加载失败', err);
      }
    };
    fetchLrc();
  }, [lrcPath, lessonId]);

  // 监听播放进度，上报进度给父页面
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    if (!isNaN(total)) onSaveProgress(current, total);
  };

  return (
    <div style={{ width: '100%', padding: 16 }}>
      <h3>{title}</h3>
      <audio
        ref={audioRef}
        src={audioSrc}
        controls
        onTimeUpdate={handleTimeUpdate}
        style={{ width: '100%' }}
      />
      <div style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>
        {lrcText || '暂无歌词'}
      </div>
    </div>
  );
};

export default AudioLesson;
