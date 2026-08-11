import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Card, Typography, Spin, Button } from 'antd';
import type { CSSProperties } from 'react';

const { Title, Paragraph } = Typography;

type LyricRaw = {
  timeNum: number;
  timeStr: string;
  isZh: boolean;
  text: string;
};
type LyricGroup = {
  timeNum: number;
  timeStr: string;
  enText: string;
  zhText: string | null;
};

export interface AudioLessonProps {
  audioUrl: string;
  lyricSource: string;
  title: string;
}

const AudioLesson: React.FC<AudioLessonProps> = ({ audioUrl, lyricSource, title }) => {
  // 音频DOM容器
  const audioRef = useRef<HTMLAudioElement>(null);
  // 歌词滚动容器
  const lyricScrollRef = useRef<HTMLDivElement>(null);
  // 每行歌词DOM存储
  const lyricLineRefs = useRef<(HTMLDivElement | null)[]>([]);
  // 缓冲模块DOM容器
  const bufferWrapRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);

  // 运行时缓存变量（不触发组件重渲染）
  const currentTimeRef = useRef(0);
  const isBufferingRef = useRef(false);
  const lastPercentRef = useRef(0);
  const progressTimerRef = useRef<number | null>(null);
  // 存储当前正在播放的歌词下标，用于高亮
  const activeLyricIndexRef = useRef<number>(-1);

  // 低频状态（仅加载/切换翻译时更新，不会高频触发）
  const [lyricText, setLyricText] = useState<string>('');
  const [lyricLoading, setLyricLoading] = useState<boolean>(false);
  const [showChinese, setShowChinese] = useState(true);
  const [metaLoaded, setMetaLoaded] = useState(false);

  // 歌词普通样式
  const lyricLineNormal: CSSProperties = {
    margin: '24px 0',
    textAlign: 'center',
    color: '#999',
    transition: 'all 0.3s ease',
  };

  // 高亮歌词样式（已在渲染逻辑使用，消除TS未使用警告）
  const lyricLineActive: CSSProperties = {
    ...lyricLineNormal,
    color: '#1677ff',
    fontWeight: 700,
    fontSize: 18,
    transform: 'scale(1.03) translateZ(0)',
  };

  // 外层卡片样式
  const cardStyle = { root: { padding: 0 } as CSSProperties };
  // 音频容器样式
  const audioWrapStyle: CSSProperties = {
    marginBottom: 16,
    minHeight: 140,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transform: 'translateZ(0)',
    willChange: 'none',
  };
  // 歌词容器样式
  const lyricBoxStyle: CSSProperties = {
    maxHeight: 320,
    overflowY: 'auto',
    padding: 12,
    background: '#f7f7f7',
    borderRadius: 6,
    transform: 'translateZ(0)',
  };

  // 歌词行ref绑定函数
  const setLyricLineRef = (idx: number) => (el: HTMLDivElement | null) => {
    lyricLineRefs.current[idx] = el;
  };

  // 解析LRC歌词文本
  const parseLrcText = (raw: string): LyricRaw[] => {
    const lines = raw.split('\n');
    const list: LyricRaw[] = [];
    const reg = /\[(\d{2}):(\d{2})\.(\d{2,3})(:zh)?\]/g;
    for (const line of lines) {
      const matchArr = [...line.matchAll(reg)];
      if (!matchArr.length) continue;
      const text = line.replace(reg, '').trim();
      if (!text) continue;
      for (const m of matchArr) {
        const min = Number(m[1]);
        const sec = Number(m[2]);
        const ms = Number(m[3]);
        const isZh = !!m[4];
        const timeNum = min * 60 + sec + ms / 1000;
        const timeStr = `${m[1]}:${m[2]}.${m[3]}`;
        list.push({ timeNum, timeStr, isZh, text });
      }
    }
    return list.sort((a, b) => a.timeNum - b.timeNum);
  };

  // 格式化歌词分组数据
  const groupedLyrics = useMemo<LyricGroup[]>(() => {
    const rawList = parseLrcText(lyricText);
    const map = new Map<number, LyricGroup>();
    rawList.forEach(item => {
      if (!map.has(item.timeNum)) {
        map.set(item.timeNum, {
          timeNum: item.timeNum,
          timeStr: item.timeStr,
          enText: '',
          zhText: null,
        });
      }
      const target = map.get(item.timeNum)!;
      if (item.isZh) target.zhText = item.text;
      else target.enText = item.text;
    });
    return Array.from(map.values());
  }, [lyricText]);

  // 仅更新播放时间缓存，不触发渲染
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    currentTimeRef.current = audioRef.current.currentTime;
  }, []);

  // 缓冲进度更新：直接操作原生DOM，完全不触发React重渲染
  const handleProgress = useCallback(() => {
    if (progressTimerRef.current) return;
    progressTimerRef.current = window.setTimeout(() => {
      const audio = audioRef.current;
      if (!audio || !metaLoaded || audio.duration === 0 || !bufferWrapRef.current) return;
      const bufferedEnd = audio.buffered.length ? audio.buffered.end(audio.buffered.length - 1) : 0;
      const percent = Math.floor((bufferedEnd / audio.duration) * 100);

      if (Math.abs(percent - lastPercentRef.current) >= 1) {
        lastPercentRef.current = percent;
        if (progressBarRef.current) progressBarRef.current.style.width = `${percent}%`;
        if (progressTextRef.current) progressTextRef.current.innerText = `${percent}%`;
      }

      if (percent === 100 && isBufferingRef.current) {
        isBufferingRef.current = false;
        bufferWrapRef.current.style.display = 'none';
      }
      progressTimerRef.current = null;
    }, 150);
  }, [metaLoaded]);

  // 开始缓冲，直接修改DOM显示
  const handleWaiting = useCallback(() => {
    if (!bufferWrapRef.current || isBufferingRef.current) return;
    isBufferingRef.current = true;
    bufferWrapRef.current.style.display = 'block';
  }, []);

  // 缓冲完成，隐藏缓冲提示
  const handleCanPlay = useCallback(() => {
    if (!bufferWrapRef.current || !isBufferingRef.current) return;
    isBufferingRef.current = false;
    bufferWrapRef.current.style.display = 'none';
  }, []);

  // 音频元数据加载完成
  const handleLoadedMeta = () => setMetaLoaded(true);

  // 歌词滚动 + 实时更新高亮下标（RAF循环，无state更新）
  useEffect(() => {
    let rafId: number;
    const scrollLyric = () => {
      const playTime = currentTimeRef.current;
      let activeIdx = -1;
      // 匹配当前播放进度对应的歌词
      for (let i = 0; i < groupedLyrics.length; i++) {
        if (groupedLyrics[i].timeNum <= playTime) activeIdx = i;
      }
      // 更新高亮下标缓存
      activeLyricIndexRef.current = activeIdx;

      if (activeIdx < 0 || !lyricScrollRef.current) {
        rafId = requestAnimationFrame(scrollLyric);
        return;
      }
      const targetLine = lyricLineRefs.current[activeIdx];
      if (!targetLine) {
        rafId = requestAnimationFrame(scrollLyric);
        return;
      }
      // 歌词居中滚动
      const scrollBox = lyricScrollRef.current;
      const boxHeight = scrollBox.clientHeight;
      const lineTop = targetLine.offsetTop;
      const lineHeight = targetLine.offsetHeight;
      scrollBox.scrollTop = lineTop - boxHeight / 2 + lineHeight / 2 - 80;
      rafId = requestAnimationFrame(scrollLyric);
    };
    rafId = requestAnimationFrame(scrollLyric);
    return () => cancelAnimationFrame(rafId);
  }, [groupedLyrics]);

  // 加载歌词文件
  useEffect(() => {
    const loadLyric = async () => {
      setLyricLoading(true);
      setLyricText('');
      if (!lyricSource) {
        setLyricLoading(false);
        return;
      }
      try {
        const res = await fetch(lyricSource);
        if (!res.ok) throw new Error('歌词加载失败');
        const text = await res.text();
        setLyricText(text);
      } catch (err) {
        console.error('歌词加载异常', err);
        setLyricText('');
      } finally {
        setLyricLoading(false);
      }
    };
    loadLyric();
  }, [lyricSource]);

  // 音频事件绑定，仅音频地址变更时重新挂载
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    audio.src = audioUrl;
    audio.load();
    lastPercentRef.current = 0;
    if (progressBarRef.current) progressBarRef.current.style.width = '0%';

    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMeta);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMeta);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, [audioUrl, handleProgress, handleWaiting, handleCanPlay, handleLoadedMeta, handleTimeUpdate]);

  // 缓存歌词DOM渲染，仅歌词/翻译开关变化才重渲染
  const lyricDom = useMemo(() => {
    if (lyricLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="small" />
        </div>
      );
    }
    if (!lyricText) return <Paragraph type="secondary">暂无歌词</Paragraph>;

    const currentActiveIdx = activeLyricIndexRef.current;
    return (
      <div ref={lyricScrollRef} style={lyricBoxStyle}>
        {groupedLyrics.map((line, idx) => (
          <div
            key={idx}
            ref={setLyricLineRef(idx)}
            // 根据下标切换高亮样式，lyricLineActive变量被正常使用
            style={idx === currentActiveIdx ? lyricLineActive : lyricLineNormal}
          >
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6, fontFamily: 'monospace' }}>
              [{line.timeStr}]
            </div>
            <div style={{ fontSize: 18 }}>{line.enText}</div>
            {showChinese && line.zhText && (
              <div style={{ fontSize: 14, marginTop: 6, opacity: 0.85 }}>
                {line.zhText}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }, [lyricLoading, lyricText, groupedLyrics, showChinese]);

  return (
    <Card title={title} styles={cardStyle}>
      <div style={audioWrapStyle}>
        {/* 缓冲提示模块，纯原生DOM操作，无React重渲染 */}
        <div
          ref={bufferWrapRef}
          style={{
            padding: '16px 0',
            textAlign: 'center',
            display: 'none',
            transform: 'translateZ(0)',
          }}
        >
          <Spin size="small" style={{ marginRight: 8 }} />
          <span>歌曲缓冲中 <span ref={progressTextRef}>0%</span></span>
          {/* 原生CSS进度条，无antd重绘问题 */}
          <div style={{ width: '100%', height: 8, background: '#e8e8e8', borderRadius: 4, marginTop: 12 }}>
            <div
              ref={progressBarRef}
              style={{
                height: '100%',
                width: '0%',
                background: '#1677ff',
                borderRadius: 4,
                transition: 'width 0.15s linear',
              }}
            />
          </div>
          <p style={{ color: '#666', fontSize: 12, margin: '4px 0 0' }}>
            缓冲完成即可播放，无需等待全部下载
          </p>
        </div>

        {/* 原生音频播放器 */}
        <audio
          ref={audioRef}
          controls
          style={{
            width: '100%',
            pointerEvents: metaLoaded ? 'auto' : 'none',
            opacity: metaLoaded ? 1 : 0.6,
          }}
        />
      </div>

      {/* 翻译切换按钮 */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>显示中文翻译：</span>
        <Button size="small" onClick={() => setShowChinese(!showChinese)}>
          {showChinese ? '已开启' : '已关闭'}
        </Button>
      </div>

      <Title level={5} style={{ marginBottom: 8 }}>歌词</Title>
      {lyricDom}
    </Card>
  );
};

// 组件缓存，父组件更新不会触发本组件重渲染
export default memo(AudioLesson);
