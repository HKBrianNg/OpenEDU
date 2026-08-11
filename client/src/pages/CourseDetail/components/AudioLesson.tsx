import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Card, Typography, Spin, Button } from 'antd';
import type { CSSProperties } from 'react';

const { Paragraph } = Typography;

// 单条歌词结构
type LyricRaw = {
  timeNum: number;
  timeStr: string;
  isZh: boolean;
  text: string;
};
// 合并后双语歌词
type LyricGroup = {
  timeNum: number;
  timeStr: string;
  enText: string;
  zhText: string | null;
};

// 组件入参类型定义
export interface AudioLessonProps {
  audioUrl: string;
  lyricSource: string;
  title: string;
}

const AudioLesson: React.FC<AudioLessonProps> = memo(({ audioUrl, lyricSource, title }) => {
  // DOM Ref
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricLineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lyricScrollRef = useRef<HTMLDivElement>(null);

  // 运行时缓存（不触发渲染）
  const currentTimeRef = useRef(0);
  const prevActiveIdxRef = useRef<number>(-1);

  // 状态（仅切换歌词/翻译时更新，播放不更新）
  const [lyricText, setLyricText] = useState<string>('');
  const [lyricLoading, setLyricLoading] = useState<boolean>(false);
  const [showChinese, setShowChinese] = useState(true);

  // 样式常量
  const lyricLineNormal: CSSProperties = {
    margin: '20px 0',
    textAlign: 'center',
    color: '#999',
    transition: 'all 0.3s ease',
  };
  const lyricLineActive: CSSProperties = {
    ...lyricLineNormal,
    color: '#1677ff',
    fontWeight: 700,
    fontSize: 18,
    transform: 'scale(1.03)',
  };
  const audioWrapStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    marginBottom: 16,
  };
  const audioPlayerStyle: CSSProperties = {
    flex: 1,
    height: '60px',
    // 移除pointerEvents锁定，永远可点击
  };
  const lyricBoxStyle: CSSProperties = {
    maxHeight: 320,
    overflowY: 'auto',
    padding: 12,
    background: '#f7f7f7',
    borderRadius: 6,
  };

  // 绑定歌词行DOM
  const setLyricLineRef = (idx: number) => (el: HTMLDivElement | null) => {
    lyricLineRefs.current[idx] = el;
  };

  // LRC歌词解析函数
  const parseLrcText = (raw: string): LyricRaw[] => {
    const lines = raw.split('\n');
    const lyricList: LyricRaw[] = [];
    const reg = /\[(\d{2}):(\d{2})\.(\d{2,3})(:zh)?\]/g;

    for (const line of lines) {
      const matchArr = [...line.matchAll(reg)];
      if (!matchArr.length) continue;
      const text = line.replace(reg, '').trim();
      if (!text) continue;

      for (const match of matchArr) {
        const min = Number(match[1]);
        const sec = Number(match[2]);
        const ms = Number(match[3]);
        const isZh = !!match[4];
        const timeNum = min * 60 + sec + ms / 1000;
        const timeStr = `${match[1]}:${match[2]}.${match[3]}`;
        lyricList.push({ timeNum, timeStr, isZh, text });
      }
    }
    return lyricList.sort((a, b) => a.timeNum - b.timeNum);
  };

  // 合并双语歌词（仅歌词加载时计算一次）
  const groupedLyrics = useMemo<LyricGroup[]>(() => {
    const rawLyrics = parseLrcText(lyricText);
    const map = new Map<number, LyricGroup>();

    rawLyrics.forEach(item => {
      if (!map.has(item.timeNum)) {
        map.set(item.timeNum, {
          timeNum: item.timeNum,
          timeStr: item.timeStr,
          enText: '',
          zhText: null
        });
      }
      const target = map.get(item.timeNum)!;
      if (item.isZh) target.zhText = item.text;
      else target.enText = item.text;
    });
    return Array.from(map.values());
  }, [lyricText]);

  // 时间更新回调：仅切换歌词时修改DOM高亮，无持续循环阻塞
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    currentTimeRef.current = audio.currentTime;
    const playTime = currentTimeRef.current;

    let activeIdx = -1;
    // 匹配当前播放进度对应的歌词
    for (let i = 0; i < groupedLyrics.length; i++) {
      if (groupedLyrics[i].timeNum <= playTime) {
        activeIdx = i;
      } else break;
    }

    // 歌词未切换，直接跳过
    if (activeIdx === prevActiveIdxRef.current) return;

    // 清除上一行高亮
    const lastLineEl = lyricLineRefs.current[prevActiveIdxRef.current];
    if (lastLineEl) Object.assign(lastLineEl.style, lyricLineNormal);

    // 设置当前行高亮
    const currLineEl = lyricLineRefs.current[activeIdx];
    if (currLineEl) Object.assign(currLineEl.style, lyricLineActive);

    // 滚动到当前歌词
    if (lyricScrollRef.current && currLineEl) {
      lyricScrollRef.current.scrollTo({
        top: currLineEl.offsetTop - lyricScrollRef.current.clientHeight / 2,
        behavior: "smooth"
      });
    }

    prevActiveIdxRef.current = activeIdx;
  };

  // 加载歌词文件
  useEffect(() => {
    const loadLyric = async () => {
      setLyricLoading(true);
      setLyricText('');
      prevActiveIdxRef.current = -1;
      if (!lyricSource) {
        setLyricLoading(false);
        return;
      }
      try {
        const res = await fetch(lyricSource);
        const lrcContent = await res.text();
        setLyricText(lrcContent);
      } catch (err) {
        console.error('歌词文件加载失败：', err);
        setLyricText('');
      } finally {
        setLyricLoading(false);
      }
    };
    loadLyric();
  }, [lyricSource]);

  // 音频绑定事件
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const handleMediaError = () => {
      console.error('音频加载异常，错误码：', audio.error?.code, audio.error?.message);
    };
    const handleMetaReady = () => {
      console.log('音频元数据加载完成，总时长：', audio.duration);
    };

    audio.src = audioUrl;
    audio.preload = "metadata";
    audio.load();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleMediaError);
    audio.addEventListener('loadedmetadata', handleMetaReady);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleMediaError);
      audio.removeEventListener('loadedmetadata', handleMetaReady);
    };
  }, [audioUrl, groupedLyrics]);

  // 歌词渲染（仅加载/切换翻译刷新，播放全程静态）
  const lyricDom = useMemo(() => {
    if (lyricLoading) {
      return <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /> 加载歌词中...</div>;
    }
    if (!lyricText) return <Paragraph type="secondary" style={{ textAlign: 'center' }}>暂无歌词</Paragraph>;

    return (
      <div ref={lyricScrollRef} style={lyricBoxStyle}>
        {groupedLyrics.map((line, idx) => (
          <div key={idx} ref={setLyricLineRef(idx)} style={lyricLineNormal}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>[{line.timeStr}]</div>
            <div style={{ fontSize: 16 }}>{line.enText}</div>
            {showChinese && line.zhText && (
              <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>{line.zhText}</div>
            )}
          </div>
        ))}
      </div>
    );
  }, [lyricLoading, lyricText, groupedLyrics, showChinese]);

  return (
    <Card title={title}>
      <div style={audioWrapStyle}>
        <audio ref={audioRef} controls style={audioPlayerStyle} />
        <Button size="small" onClick={() => setShowChinese(!showChinese)}>
          {showChinese ? '关闭中文' : '显示中文'}
        </Button>
      </div>
      {lyricDom}
    </Card>
  );
});

export default AudioLesson;
