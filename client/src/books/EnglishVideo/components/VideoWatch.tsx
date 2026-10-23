// client/src/books/EnglishVideo/components/VideoWatch.tsx
//
// 站内观看页：左边视频（能内嵌就 iframe 播放，否则降级为外链按钮），
// 右边台词同屏。台词会跟着播放进度走：当前句高亮并自动滚入视野，
// 点某一句可以跳到该句开始播放。
//
// 跟随只对 YouTube 生效（B站播放器没有对应的 JS 接口），并且要求台词带 start。

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Switch, Typography } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useSpeech } from '../../EnglishWord/hooks/useSpeech';
import { toEmbedUrl } from '../utils/embedUrl';
import { findLineIndex, formatTime, parseStart } from '../utils/time';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import type { TranscriptLine, VideoItem } from '../types';

const { Title, Text } = Typography;

interface VideoWatchProps {
  item: VideoItem;
  lines: TranscriptLine[];
  onBack: () => void;
  onLearn: (item: VideoItem) => void;
  onQuiz: (item: VideoItem) => void;
}

export default function VideoWatch({ item, lines, onBack, onLearn, onQuiz }: VideoWatchProps) {
  const { locale, t } = useLocale();
  const isMobile = useIsMobile();
  const { speakingId, speak } = useSpeech();

  const embed = toEmbedUrl(item.url);
  const hasLines = lines.length > 0;
  const name = locale === 'zh' && item.chineseName ? item.chineseName : item.englishName;

  // 只有 YouTube 内嵌才有 JS 接口；台词要带 start 才能对上时间
  const isYouTubeEmbed = Boolean(embed && /youtube(-nocookie)?\.com\/embed/.test(embed));
  const hasStart = lines.some((l) => l.start);
  const canSync = Boolean(embed) && isYouTubeEmbed && hasLines && hasStart;

  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);
  const [follow, setFollow] = useState(true);
  const { ready, time, seekTo } = useYouTubePlayer(canSync ? iframeEl : null);

  const listRef = useRef<HTMLDivElement>(null);

  // 当前播放到第几句；没跟随或播放器没就绪时不高亮
  const currentIdx = useMemo(() => {
    if (!follow || !ready) return -1;
    return findLineIndex(lines, time);
  }, [follow, ready, time, lines]);

  // 当前句变化时滚进视野（只在台词区内滚，不影响整页）
  useEffect(() => {
    if (currentIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-line="${lines[currentIdx].index}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentIdx, lines]);

  const embedSrc = embed
    ? `${embed}${embed.includes('?') ? '&' : '?'}enablejsapi=1&origin=${encodeURIComponent(
        window.location.origin,
      )}`
    : null;

  return (
    <div>
      {/* 顶栏：返回 + 标题 + 练习入口 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Button onClick={onBack} style={{ borderRadius: 99 }}>
          ← {t('englishVideo.backToList')}
        </Button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Title level={4} style={{ margin: 0, fontSize: 18 }}>
            {name}
          </Title>
          {item.episode && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.episode}
            </Text>
          )}
        </div>
        {hasLines && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => onLearn(item)} style={{ borderRadius: 99 }}>
              {t('englishVideo.learn')}
            </Button>
            <Button onClick={() => onQuiz(item)} style={{ borderRadius: 99 }}>
              {t('englishVideo.quiz')}
            </Button>
          </div>
        )}
      </div>

      {/* 主体：视频 + 台词 */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        {/* 视频区 */}
        <div style={{ flex: isMobile ? undefined : 2, minWidth: 0, width: '100%' }}>
          {embedSrc ? (
            <iframe
              // key 让换片子时重建元素，播放器随之重新接管（而不是复用旧实例）
              key={embed}
              ref={setIframeEl}
              src={embedSrc}
              title={item.englishName}
              // index.html 里有 <meta name="referrer" content="no-referrer">（为绕过
              // raw.githubusercontent 防盗链），会把所有请求的 Referer 掐掉。
              // 但 YouTube 服务条款要求嵌入方必须提供 Referer，缺失会直接播放失败
              // （error 153，只能点「在 YouTube 上观看」）。
              // 元素上的 referrerPolicy 优先级高于 <meta>，这里显式覆盖回来：
              // 跨域时发送本站 origin，既能满足 YouTube，又不泄露具体页面路径。
              referrerPolicy="strict-origin-when-cross-origin"
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                border: 0,
                borderRadius: 12,
                background: '#000',
                display: 'block',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                borderRadius: 12,
                border: '1px dashed #d0d0d0',
                background: '#fafbfc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                textAlign: 'center',
                padding: 20,
                boxSizing: 'border-box',
              }}
            >
              <Text strong style={{ fontSize: 15 }}>
                {t('englishVideo.cannotEmbed')}
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t('englishVideo.cannotEmbedTip')}
              </Text>
              <Button
                type="primary"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ borderRadius: 99 }}
              >
                {t('englishVideo.openOriginal')} ↗
              </Button>
            </div>
          )}
        </div>

        {/* 台词区 */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <Text strong style={{ fontSize: 15 }}>
              {t('englishVideo.transcript')}
            </Text>
            {hasLines && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {lines.length}
              </Text>
            )}
            {canSync && (
              <>
                <Switch size="small" checked={follow} onChange={setFollow} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('englishVideo.followPlayback')}
                </Text>
                {ready && (
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
                    {formatTime(time)}
                  </Text>
                )}
              </>
            )}
          </div>

          {hasLines ? (
            <div
              ref={listRef}
              style={{
                // 高度跟视频区对齐：宽屏用视口高度减去页头，窄屏给个固定高度
                height: isMobile ? 360 : 'calc(min(100vw * 0.56, 640px))',
                maxHeight: 'calc(100vh - 220px)',
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {lines.map((line, i) => {
                const active = speakingId === String(line.index);
                const isCurrent = i === currentIdx;
                const canJump = canSync && ready && Boolean(line.start);
                return (
                  <div
                    key={line.index}
                    data-line={line.index}
                    onClick={canJump ? () => seekTo(parseStart(line.start)) : undefined}
                    title={canJump ? t('englishVideo.jumpHere') : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      marginBottom: 8,
                      cursor: canJump ? 'pointer' : 'default',
                      background: active ? '#e8f2ff' : isCurrent ? '#fffbe6' : '#fafbfc',
                      border: '1px solid',
                      borderColor: active ? '#b9d6ff' : isCurrent ? '#ffe58f' : '#f0f0f0',
                      // 当前句左侧加一条色条，余光就能看到播到哪了
                      borderLeft: isCurrent ? '3px solid #faad14' : '3px solid transparent',
                      transition: 'background 0.2s, border-color 0.2s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{line.zh}</div>
                      <div style={{ fontSize: 15, color: '#222', fontWeight: 500, lineHeight: 1.5 }}>
                        {line.en}
                      </div>
                    </div>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(line.en, 'en-US', String(line.index));
                      }}
                      style={{ borderRadius: 99, flexShrink: 0 }}
                      title={t('englishVideo.speak')}
                    >
                      {active ? '⏸' : '🔊'}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                padding: '28px 16px',
                borderRadius: 12,
                border: '1px dashed #d0d0d0',
                background: '#fafbfc',
                textAlign: 'center',
                color: '#999',
                fontSize: 13,
              }}
            >
              {t('englishVideo.noTranscript')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
