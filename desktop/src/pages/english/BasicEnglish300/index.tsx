// desktop/src/pages/english/BasicEnglish300/index.tsx

import { useEffect, useRef, useState } from 'react';
import { Typography, Collapse, Spin, Modal } from 'antd';
import { getCourseBaseUrl, getCourseDataUrl } from '../../../utils/coursePath';
import { safeJsonFetch } from '../../../utils/safeFetch';
import { applyVoiceSettings } from '../../../utils/speech';
import { useLocale } from '../../../store/LocaleContext';
import type { BasicEnglishData, Chapter, LessonItem } from './types';
import SentenceShortsModal from './components/SentenceShortsModal';
import './basicEnglish300.css';

const { Title, Paragraph } = Typography;

const COURSE_ID = 'BasicEnglish300';
const CHAPTER_CACHE_PREFIX = 'be300_chapter_';

type RuntimeChapter = Omit<Chapter, 'items'> & {
  chapterNum: number;
  items?: LessonItem[];
};

const chapterItems = (c: RuntimeChapter | undefined): LessonItem[] => c?.items ?? [];

const enToImageName = (en: string): string => {
  if (!en) return '';
  return en
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

function adaptItem(item: LessonItem): LessonItem {
  const enText = item.title?.en?.trim() || item.en || '';
  const imageName = enToImageName(enText);
  const raw = item as any;
  return {
    ...item,
    name: item.title?.zh?.trim() || item.name || '',
    en: enText,
    lessonImage:
      item.lessonImage ||
      raw.image ||
      raw.img ||
      raw.picture ||
      raw.thumbnail ||
      (imageName ? `${imageName}.jpg` : undefined),
  };
}

// ────────────────────────────────────────────────────────────
// 音频预加载器
// ────────────────────────────────────────────────────────────
class AudioPreloader {
  private cache = new Map<string, HTMLAudioElement>();
  private queue: string[] = [];
  private active = 0;
  private loading = false;
  private readonly maxConcurrent = 3;

  preload(url: string): Promise<void> {
    if (this.cache.has(url)) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      audio.load();
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        this.cache.set(url, audio);
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      audio.addEventListener('canplaythrough', done, { once: true });
      audio.addEventListener('error', fail, { once: true });
      setTimeout(fail, 3000);
    });
  }

  enqueue(urls: string[]) {
    for (const url of urls) {
      if (this.cache.has(url) || this.queue.includes(url)) continue;
      this.queue.push(url);
    }
    this.drain();
  }

  spawn(url: string): HTMLAudioElement | undefined {
    const cached = this.cache.get(url);
    return cached ? (cached.cloneNode(true) as HTMLAudioElement) : undefined;
  }

  clear() {
    this.cache.clear();
    this.queue = [];
    this.active = 0;
  }

  private drain() {
    if (this.loading) return;
    this.loading = true;
    const next = () => {
      while (this.active < this.maxConcurrent && this.queue.length > 0) {
        const url = this.queue.shift()!;
        if (this.cache.has(url)) continue;
        this.active++;
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = url;
        audio.load();
        const done = () => {
          this.active--;
          next();
        };
        audio.addEventListener('canplaythrough', () => {
          this.cache.set(url, audio);
          done();
        }, { once: true });
        audio.addEventListener('error', done, { once: true });
      }
      this.loading = false;
    };
    next();
  }
}

const audioPreloader = new AudioPreloader();

function buildAudioUrls(chapter: RuntimeChapter, item: LessonItem, lang: 'zh' | 'en'): string[] {
  const enText = item.title?.en?.trim() || item.en || '';
  if (!enText) return [];
  const name = enToImageName(enText);
  if (!name) return [];
  const suffix = lang === 'zh' ? 'zh' : 'en';
  const base = getCourseBaseUrl(COURSE_ID);
  return [`${base}/content/audio/chapter-${chapter.chapterNum}/${name}_${suffix}.mp3`];
}

function preloadImage(src: string, timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(resolve, timeout);
    img.onload = () => { clearTimeout(timer); resolve(); };
    img.onerror = () => { clearTimeout(timer); resolve(); };
    img.src = src;
  });
}

export function BasicEnglish300() {
  const { t } = useLocale();

  const [data, setData] = useState<BasicEnglishData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterLoadingText, setChapterLoadingText] = useState('');
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  const [shorts, setShorts] = useState<{ lessons: LessonItem[]; chapterName: string } | null>(null);

  const preloadedChaptersRef = useRef<Set<number>>(new Set());

  // ── 首屏数据加载 ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    safeJsonFetch<BasicEnglishData>(getCourseDataUrl(COURSE_ID))
      .then((json) => {
        if (cancelled) return;
        if (!json.chapters || json.chapters.length === 0) {
          setLoadError('数据为空或格式不匹配');
          setLoading(false);
          return;
        }
        const chapters: RuntimeChapter[] = json.chapters.map((ch, idx) => ({
          ...ch,
          chapterNum: idx + 1,
        }));
        setData({ ...json, chapters } as BasicEnglishData & { chapters: RuntimeChapter[] });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : '数据加载失败');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => audioPreloader.clear(), []);

  const resolveImageUrl = (lessonImage?: string): string | undefined => {
    if (!lessonImage) return undefined;
    if (/^https?:\/\//.test(lessonImage) || lessonImage.startsWith('data:')) return lessonImage;
    const base = getCourseBaseUrl(COURSE_ID);
    const clean = lessonImage.replace(/^\/+/, '');
    if (clean.startsWith('content/images/') || clean.startsWith('images/')) {
      return `${base}/${clean}`;
    }
    return `${base}/content/images/${clean}`;
  };

  // ── 章节内容懒加载 ──
  const loadChapterContent = async (chapter: RuntimeChapter): Promise<LessonItem[]> => {
    const cacheKey = `${CHAPTER_CACHE_PREFIX}${chapter.chapterNum}`;

    if (chapter.items && chapter.items.length > 0) return chapter.items;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as any[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const items = parsed.map((i: any) => adaptItem(i));
          patchChapter(chapter.chapterNum, items);
          return items;
        }
      }
    } catch {
      /* cache corrupted */
    }

    const file = chapter.contentLink;
    if (!file) {
      console.warn(`[skip] chapter "${chapter.name}" has no contentLink`);
      return [];
    }

    const base = getCourseBaseUrl(COURSE_ID);
    const tryUrls = [
      `${base}/content/${file.replace(/^\/+/, '')}`,
      `${base}/${file.replace(/^\/+/, '')}`,
      `/books/${COURSE_ID}/content/${file.replace(/^\/+/, '')}`,
    ];

    let rawItems: any[] = [];
    for (const url of tryUrls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          if (text.trim().startsWith('<')) continue;
          try { rawItems = JSON.parse(text); } catch { /* not json */ }
        } else {
          const json = await res.json();
          rawItems = Array.isArray(json) ? json : (json.items || []);
        }
        break;
      } catch {
        /* try next */
      }
    }

    const items = rawItems.map((i: any) => adaptItem(i));
    try {
      localStorage.setItem(cacheKey, JSON.stringify(items));
    } catch {
      /* quota exceeded */
    }
    patchChapter(chapter.chapterNum, items);
    return items;
  };

  const patchChapter = (num: number, items: LessonItem[]) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        chapters: (prev.chapters as RuntimeChapter[]).map((c) =>
          c.chapterNum === num ? { ...c, items } : c,
        ),
      } as BasicEnglishData & { chapters: RuntimeChapter[] };
    });
  };

  // ── 音频播放 ──
  const playAudio = (chapter: RuntimeChapter, item: LessonItem, lang: 'zh' | 'en') => {
    const enText = item.title?.en?.trim() || item.en || '';
    const zhText = item.title?.zh?.trim() || item.name || '';
    const targetText = lang === 'zh' ? zhText : enText;
    if (!targetText) return;

    const urls = buildAudioUrls(chapter, item, lang);
    for (const url of urls) {
      const inst = audioPreloader.spawn(url);
      if (inst) {
        inst.currentTime = 0;
        inst.play().catch(() => fallbackTTS(targetText, lang));
        return;
      }
    }
    const audio = new Audio(urls[0]);
    audio.play().catch(() => fallbackTTS(targetText, lang));
  };

  const fallbackTTS = (text: string, lang: 'zh' | 'en') => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    applyVoiceSettings(utterance, lang === 'zh' ? 'zh-CN' : 'en-US');
    window.speechSynthesis.speak(utterance);
  };

  // ── 展开/收起 ──
  const handleCollapseChange = async (keys: string | string[]) => {
    const arr = Array.isArray(keys) ? keys : keys ? [keys] : [];
    if (arr.length === 0) {
      setActiveKeys([]);
      return;
    }

    const lastKey = arr[arr.length - 1];
    const chapterNum = parseInt(lastKey, 10);
    const list = (data?.chapters ?? []) as RuntimeChapter[];
    const target = list.find((c) => c.chapterNum === chapterNum);

    if (!target) {
      setActiveKeys([lastKey]);
      return;
    }

    if (activeKeys.includes(lastKey)) {
      setActiveKeys(arr.filter((k) => k !== lastKey));
      return;
    }

    if (!chapterItems(target).length && !preloadedChaptersRef.current.has(chapterNum)) {
      preloadedChaptersRef.current.add(chapterNum);
      setChapterLoading(true);
      setChapterLoadingText(`正在加载「${target.name}」...`);

      try {
        const items = await loadChapterContent(target);

        const audioUrls = new Set<string>();
        const imgUrls: string[] = [];
        for (const item of items) {
          buildAudioUrls(target, item, 'en').forEach((u) => audioUrls.add(u));
          buildAudioUrls(target, item, 'zh').forEach((u) => audioUrls.add(u));
          const imgUrl = resolveImageUrl(item.lessonImage);
          if (imgUrl) imgUrls.push(imgUrl);
        }

        const allAudio = Array.from(audioUrls);
        const allImg = imgUrls;

        setChapterLoadingText(
          `正在准备音频与图片 (${allAudio.length} 个音频, ${allImg.length} 张图)...`,
        );

        await Promise.allSettled([
          ...allAudio.slice(0, 6).map((u) => audioPreloader.preload(u)),
          ...allImg.slice(0, 3).map((u) => preloadImage(u)),
        ]);

        setChapterLoading(false);
        setActiveKeys([lastKey]);

        // 后台静默加载剩余
        setTimeout(() => {
          audioPreloader.enqueue(allAudio.slice(6));
          for (const src of allImg.slice(3)) {
            const link = document.createElement('link');
            link.rel = 'preload';

            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
          }
        }, 0);
      } catch {
        setChapterLoading(false);
        setActiveKeys([lastKey]);
      }
    } else {
      setActiveKeys([lastKey]);
    }
  };

  // ── 短片 ──
  const handleShortsClick = async (chapter: RuntimeChapter) => {
    const items = chapterItems(chapter);
    if (items.length === 0) {
      setChapterLoading(true);
      setChapterLoadingText(`正在加载「${chapter.name}」...`);
      try {
        const loaded = await loadChapterContent(chapter);
        const audioCnt = loaded.length * 2;
        const imgCnt = loaded.length;
        setChapterLoadingText(`正在准备短片音图 (${audioCnt} 个音频, ${imgCnt} 张图)...`);
        setTimeout(() => {
          setChapterLoading(false);
          setShorts({ lessons: loaded, chapterName: chapter.name });
        }, 600);
      } catch {
        setChapterLoading(false);
        setShorts({ lessons: [], chapterName: chapter.name });
      }
    } else {
      const audioCnt = items.length * 2;
      const imgCnt = items.length;
      setChapterLoading(true);
      setChapterLoadingText(`正在准备短片音图 (${audioCnt} 个音频, ${imgCnt} 张图)...`);
      setTimeout(() => {
        setChapterLoading(false);
        setShorts({ lessons: items, chapterName: chapter.name });
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="basic-english-300-scroll" style={{ textAlign: 'center', padding: 40 }}>
        <Spin description="加载中..." />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="basic-english-300-scroll" style={{ padding: 24, color: '#d93025' }}>
        <h3>数据加载失败</h3>
        <p>{loadError}</p>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="basic-english-300-scroll" style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      {/* 加载遮罩 */}
      <Modal
        open={chapterLoading}
        footer={null}
        closable={false}
        maskClosable={false}
        width={400}
        styles={{ body: { textAlign: 'center', padding: '32px 24px' } }}
      >
        <Spin size="large" />
        <div style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
          {chapterLoadingText}
        </div>
      </Modal>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 4 }}>{data.title}</Title>
        <Paragraph italic style={{ color: '#888', fontSize: 16, marginBottom: 0 }}>{data.titleEn}</Paragraph>
      </div>

      <Collapse
        activeKey={activeKeys}
        accordion={false}
        onChange={handleCollapseChange}
        style={{ background: 'transparent', border: 'none' }}
        items={(data.chapters as RuntimeChapter[]).map((chapter) => {
          const items = chapterItems(chapter);
          const visibleItems = items.map((i) => adaptItem(i));
          const isEmpty = items.length === 0;

          return {
            key: String(chapter.chapterNum),
            label: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' }}>
                <div style={{ minWidth: 0 }}>
                  <Title level={4} style={{ margin: 0 }}>{chapter.name}</Title>
                  <span style={{ color: '#888', fontSize: 13 }}>{chapter.en}</span>
                </div>
                {!isEmpty && visibleItems.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShortsClick(chapter);
                    }}
                    style={{
                      padding: '5px 13px',
                      fontSize: 13,
                      borderRadius: 99,
                      border: '1px solid #d0d0d0',
                      background: '#fff',
                      color: '#333',
                      cursor: 'pointer',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ▶ 短片
                  </button>
                )}
              </div>
            ),
            children: isEmpty ? (
              <div style={{ padding: '14px 18px', color: '#aaa', fontSize: 13 }}>
                点击标题展开以加载内容…
              </div>
            ) : visibleItems.length === 0 ? (
              <div style={{ padding: '14px 18px', color: '#999', fontSize: 13 }}>
                {t('basicenglish300.filterNoMatch') || '没有句子'}
              </div>
            ) : (
              <div style={{ borderRadius: 8, border: '1px solid #f0f0f0', background: '#fff' }}>
                {visibleItems.map((item, itemIndex) => {
                  const imageUrl = resolveImageUrl(item.lessonImage);
                  return (
                    <div
                      key={`${chapter.name}-${itemIndex}-${item.en}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        borderBottom: itemIndex < visibleItems.length - 1 ? '1px solid #f0f0f0' : 'none',
                      }}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.en}
                          style={{ width: 96, height: 96, borderRadius: 6, objectFit: 'cover', flexShrink: 0, background: '#f5f5f5' }}
                        />
                      ) : (
                        <div style={{ width: 96, height: 96, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          onClick={() => playAudio(chapter, item, 'zh')}
                          style={{ fontSize: 15, color: '#222', fontWeight: 500, cursor: item.name ? 'pointer' : 'default', userSelect: 'none' }}
                          title="点击朗读中文"
                        >
                          {item.name}
                        </div>
                        <div
                          onClick={() => playAudio(chapter, item, 'en')}
                          style={{ fontSize: 13, color: '#666', marginTop: 4, cursor: item.en ? 'pointer' : 'default', userSelect: 'none' }}
                          title="点击朗读英文"
                        >
                          {item.en}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ),
          };
        })}
      />

      {/* 短片弹窗 */}
      <SentenceShortsModal
        lessons={shorts?.lessons ?? []}
        resolveImageUrl={resolveImageUrl}
        chapterName={shorts?.chapterName}
        open={shorts !== null}
        onClose={() => setShorts(null)}
      />
    </div>
  );
}

BasicEnglish300.displayName = 'BasicEnglish300';