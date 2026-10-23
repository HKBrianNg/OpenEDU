// client/src/books/EnglishVideo/hooks/useYouTubePlayer.ts
//
// 拿 YouTube 播放器的当前播放时间，用来让台词跟着视频走。
//
// 这里不是用常见的 new YT.Player('divId')（API 会自己造一个 iframe），
// 而是 new YT.Player(iframeEl) —— 把 React 已经渲染好的 iframe 交给 API 接管。
// 原因：index.html 里有 <meta name="referrer" content="no-referrer">，
// API 自建的 iframe 会继承它，导致 YouTube 拒绝播放（error 153）。
// 只有自己渲染的 iframe 才能带上 referrerPolicy 覆盖回去，
// 所以必须让 React 先建好元素，再让 API 接管这个元素。

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLIFrameElement | HTMLElement,
        opts: {
          events?: {
            onReady?: (e: { target: YouTubePlayer }) => void;
            onStateChange?: (e: { data: number; target: YouTubePlayer }) => void;
          };
        },
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayer {
  getCurrentTime?: () => number;
  seekTo?: (sec: number, allowSeekAhead: boolean) => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  destroy?: () => void;
}

/** API 脚本只加载一次，多个播放器共用 */
let apiPromise: Promise<NonNullable<Window['YT']>> | null = null;

function loadApi(): Promise<NonNullable<Window['YT']>> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(window.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => reject(new Error('YouTube IFrame API failed to load'));
    document.head.appendChild(script);
  });
  return apiPromise;
}

const POLL_MS = 250;

/**
 * 接管一个已渲染的 YouTube iframe（其 src 需带 enablejsapi=1）。
 * @param iframeEl 要接管的 iframe 元素；传 null 表示不启用（降级场景）
 */
export function useYouTubePlayer(iframeEl: HTMLIFrameElement | null) {
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(0);
  const playerRef = useRef<YouTubePlayer | null>(null);

  useEffect(() => {
    if (!iframeEl) return;
    let cancelled = false;
    let timer: number | undefined;

    loadApi()
      .then((YT) => {
        if (cancelled) return;
        // 传 iframe 元素（而不是 id），API 会复用它，referrerPolicy 得以保留
        const player = new YT.Player(iframeEl, {
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              setReady(true);
              // API 没有推送时间的事件，只能轮询；暂停时时间不变，setTime 不会触发重渲染
              timer = window.setInterval(() => {
                const t = player.getCurrentTime?.();
                if (typeof t === 'number') setTime(t);
              }, POLL_MS);
            },
          },
        });
      })
      .catch(() => {
        /* 加载失败（离线/被墙）就静默降级：不跟随，但视频和台词照常可用 */
      });

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      // 不清 player.destroy()：它会把 DOM 还原成占位元素，跟 React 管理的
      // iframe 打架。这里只停轮询，让元素随组件一起卸载。
      playerRef.current = null;
      setReady(false);
      setTime(0);
    };
  }, [iframeEl]);

  /** 跳到指定秒数并继续播放（点台词行时用） */
  const seekTo = (sec: number) => {
    const p = playerRef.current;
    if (!p || !Number.isFinite(sec)) return;
    try {
      p.seekTo?.(Math.max(0, sec), true);
      p.playVideo?.();
    } catch {
      /* 播放器还没就绪就点击，忽略 */
    }
  };

  return { ready, time, seekTo };
}
