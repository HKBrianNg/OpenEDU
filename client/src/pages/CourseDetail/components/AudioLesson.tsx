import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Card, Typography, Spin, Button } from 'antd';
import type { CSSProperties } from 'react';
// 引入项目内置国际化hook
import { useLocale } from '../../../store/LocaleContext';

const { Paragraph } = Typography;

// 歌词基础类型定义
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

// 组件入参类型
export interface AudioLessonProps {
  audioUrl: string;
  lyricSource: string;
}

const AudioLesson: React.FC<AudioLessonProps> = memo(({ audioUrl, lyricSource }) => {
  // 使用全局国际化上下文
  const { t } = useLocale();

  // DOM 引用
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricLineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lyricScrollRef = useRef<HTMLDivElement>(null);

  // 播放缓存（不触发组件重渲染）
  const currentTimeRef = useRef(0);
  const prevActiveIdxRef = useRef<number>(-1);

  // 本地状态
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
    flexWrap: 'wrap',
  };
  const audioPlayerStyle: CSSProperties = {
    flex: 1,
    minWidth: 240,
    height: '60px',
  };
  const lyricBoxStyle: CSSProperties = {
    maxHeight: 320,
    overflowY: 'auto',
    padding: 12,
    background: '#f7f7f7',
    borderRadius: 6,
  };

  // 绑定歌词行DOM节点
  const setLyricLineRef = (idx: number) => (el: HTMLDivElement | null) => {
    lyricLineRefs.current[idx] = el;
  };

  // 解析 [00:01.23:zh] 双语LRC歌词
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

  // 合并同一时间轴的中英双语歌词
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

  // 播放进度更新，仅切换歌词时修改DOM，无循环阻塞
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    currentTimeRef.current = audio.currentTime;
    const playTime = currentTimeRef.current;

    let activeIdx = -1;
    for (let i = 0; i < groupedLyrics.length; i++) {
      if (groupedLyrics[i].timeNum <= playTime) {
        activeIdx = i;
      } else break;
    }

    if (activeIdx === prevActiveIdxRef.current) return;

    // 清除上一行高亮
    const lastLineEl = lyricLineRefs.current[prevActiveIdxRef.current];
    if (lastLineEl) Object.assign(lastLineEl.style, lyricLineNormal);
    // 设置当前歌词高亮
    const currLineEl = lyricLineRefs.current[activeIdx];
    if (currLineEl) Object.assign(currLineEl.style, lyricLineActive);
    // 自动滚动到当前歌词
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
        console.error('歌词加载失败：', err);
        setLyricText('');
      } finally {
        setLyricLoading(false);
      }
    };
    loadLyric();
  }, [lyricSource]);

  // 音频事件绑定
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const handleMediaError = () => {
      console.error('音频加载异常，错误码：', audio.error?.code);
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

  // 歌词渲染（国际化文本）
  const lyricDom = useMemo(() => {
    if (lyricLoading) {
      return <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /> {t('detail.lyric.loading')}</div>;
    }
    if (!lyricText) return <Paragraph type="secondary" style={{ textAlign: 'center' }}>{t('detail.lyric.empty')}</Paragraph>;

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
  }, [lyricLoading, lyricText, groupedLyrics, showChinese, t]);

  return (
    <Card title={t('detail.audio.title')}>
      <div style={audioWrapStyle}>
        <audio ref={audioRef} controls style={audioPlayerStyle} />
        <Button size="small" onClick={() => setShowChinese(!showChinese)}>
          {showChinese ? t('detail.lyric.hideZh') : t('detail.lyric.showZh')}
        </Button>
      </div>
      {lyricDom}
    </Card>
  );
});

export default AudioLesson;
