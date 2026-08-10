import React, { useState, useEffect } from 'react';
import { Card, Typography, Spin } from 'antd';
import type { CSSProperties } from 'react';

const { Title, Paragraph } = Typography;

// 组件入参定义
export interface AudioLessonProps {
  audioUrl: string;
  lyricSource: string; // 两种格式：1.纯文本歌词 2.网络/本地文件路径
  title: string;
}

const AudioLesson: React.FC<AudioLessonProps> = ({ audioUrl, lyricSource, title }) => {
  // 内部维护歌词状态，完全剥离父页面
  const [lyricText, setLyricText] = useState<string>('');
  const [lyricLoading, setLyricLoading] = useState<boolean>(false);

  // 歌词加载逻辑（从CourseDetail迁移至此）
  useEffect(() => {
    const loadLyric = async () => {
      setLyricLoading(true);
      setLyricText('');
      if (!lyricSource) {
        setLyricLoading(false);
        return;
      }
      // 判断是否为网络/本地文件链接
      if (lyricSource.startsWith('/') || lyricSource.startsWith('http')) {
        try {
          const res = await fetch(lyricSource);
          if (!res.ok) throw new Error('歌词文件加载失败');
          const text = await res.text();
          setLyricText(text);
        } catch (err) {
          console.error('AudioLesson 加载歌词失败：', err);
          setLyricText('');
        }
      } else {
        // 直接是纯文本歌词
        setLyricText(lyricSource);
      }
      setLyricLoading(false);
    };

    loadLyric();
  }, [lyricSource]);

  const cardStyle = {
    root: { padding: 0 } as CSSProperties,
  };
  const audioWrapStyle: CSSProperties = { marginBottom: 16 };
  const lyricBoxStyle: CSSProperties = {
    minHeight: 120,
    padding: 12,
    background: '#f7f7f7',
    borderRadius: 6,
    whiteSpace: 'pre-wrap',
    fontSize: 14,
    lineHeight: 1.8
  };

  return (
    <Card title={title} styles={cardStyle}>
      {/* 音频播放器 */}
      <div style={audioWrapStyle}>
        <audio controls src={audioUrl} style={{ width: '100%' }} />
      </div>

      {/* 歌词区域 */}
      <Title level={5} style={{ marginBottom: 8 }}>歌词</Title>
      {lyricLoading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="small" />
        </div>
      ) : lyricText ? (
        <div style={lyricBoxStyle}>{lyricText}</div>
      ) : (
        <Paragraph type="secondary">暂无歌词</Paragraph>
      )}
    </Card>
  );
};

export default AudioLesson;
