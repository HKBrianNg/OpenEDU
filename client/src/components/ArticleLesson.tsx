import React, { useState, useEffect, useRef, useCallback } from 'react';

// 歌词单行类型定义
interface LyricLine {
  time: number; // 秒数，用于匹配播放进度
  enText: string;
  zhText: string;
}

interface AudioLessonProps {
  audioSrc: string;
  lrcPath: string;
  lessonId: string;
  onSaveProgress: (current: number, total: number) => void;
}

const AudioLesson: React.FC<AudioLessonProps> = ({
  audioSrc,
  lrcPath,
  lessonId,
  onSaveProgress
}) => {
  // 音频DOM实例
  const audioRef = useRef<HTMLAudioElement>(null);
  // 歌词容器DOM，用于自动滚动
  const lyricBoxRef = useRef<HTMLDivElement>(null);

  // 播放状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 歌词状态（全部内聚在当前组件）
  const [lyricList, setLyricList] = useState<LyricLine[]>([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [lyricLoading, setLyricLoading] = useState(false);

  // ---------------------- 核心：LRC文件加载 + 解析逻辑 ----------------------
  const loadAndParseLrc = useCallback(async () => {
    if (!lrcPath) return;
    setLyricLoading(true);
    try {
      const res = await fetch(lrcPath);
      const lrcRaw = await res.text();
      const lines = lrcRaw.split('\n');
      const parseResult: LyricLine[] = [];

      // 正则匹配时间戳 [00:23.12]英文|中文
      const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.+?)\|(.+)/;
      lines.forEach(line => {
        const match = line.match(timeReg);
        if (!match) return;
        // 时分秒转总秒数
        const min = Number(match[1]);
        const sec = Number(match[2]);
        const ms = Number(match[3]);
        const totalSecond = min * 60 + sec + ms / 1000;
        parseResult.push({
          time: totalSecond,
          enText: match[4].trim(),
          zhText: match[5].trim()
        });
      });
      // 按时间升序排序
      parseResult.sort((a, b) => a.time - b.time);
      setLyricList(parseResult);
    } catch (err) {
      console.error("歌词加载失败", err);
      setLyricList([]);
    } finally {
      setLyricLoading(false);
    }
  }, [lrcPath]);

  // 切换课时时重新加载歌词
  useEffect(() => {
    loadAndParseLrc();
    // 重置播放、歌词高亮
    setCurrentTime(0);
    setActiveLyricIndex(-1);
    setIsPlaying(false);
    audioRef.current?.pause();
  }, [lessonId, loadAndParseLrc]);

  // ---------------------- 音频进度监听，匹配当前歌词行 ----------------------
  useEffect(() => {
    if (lyricList.length === 0) return;
    // 倒序匹配：找到最后一条小于当前播放时间的歌词
    let targetIdx = -1;
    for (let i = lyricList.length - 1; i >= 0; i--) {
      if (lyricList[i].time <= currentTime) {
        targetIdx = i;
        break;
      }
    }
    setActiveLyricIndex(targetIdx);
  }, [currentTime, lyricList]);

  // 歌词容器自动滚动到高亮行
  useEffect(() => {
    if (!lyricBoxRef.current || activeLyricIndex < 0) return;
    const activeDom = lyricBoxRef.current.children[activeLyricIndex] as HTMLDivElement;
    if (activeDom) {
      activeDom.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeLyricIndex]);

  // ---------------------- 音频事件绑定 ----------------------
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    // 每5秒保存一次进度，避免频繁请求
    if (Math.round(time) % 5 === 0) {
      onSaveProgress(time, audioRef.current.duration);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  // 播放/暂停切换
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div style={{ width: "100%", maxWidth: 700, margin: "0 auto" }}>
      {/* 音频播放器控件 */}
      <div style={{ marginBottom: 16 }}>
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
        <button onClick={togglePlay} style={{ padding: "6px 16px" }}>
          {isPlaying ? "暂停" : "播放"}
        </button>
        <span style={{ marginLeft: 12 }}>
          {Math.floor(currentTime)}s / {Math.floor(duration)}s
        </span>
      </div>

      {/* 歌词展示区域 */}
      <div
        ref={lyricBoxRef}
        style={{
          height: 320,
          overflowY: "auto",
          padding: "16px 8px",
          border: "1px solid #eee",
          borderRadius: 8
        }}
      >
        {lyricLoading && <div>歌词加载中...</div>}
        {!lyricLoading && lyricList.length === 0 && <div>暂无歌词</div>}
        {lyricList.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: "8px 0",
              textAlign: "center",
              transition: "all 0.3s",
              color: activeLyricIndex === idx ? "#1677ff" : "#666",
              fontSize: activeLyricIndex === idx ? 16 : 14,
              fontWeight: activeLyricIndex === idx ? 600 : 400
            }}
          >
            <div>{item.enText}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>[00:{String(Math.floor(item.time)).padStart(2, '0')}] {item.zhText}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AudioLesson;
