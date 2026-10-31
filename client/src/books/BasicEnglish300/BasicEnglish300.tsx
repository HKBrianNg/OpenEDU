// client/src/books/BasicEnglish300/BasicEnglish300.tsx
//
// ★ 交互分工（本次修复重点）：
//   - 点章节标题       → 展开/收起面板，首次展开才懒加载该章 sentences + 预加载音图
//   - 点「▶ 短片」按钮 → 直接弹出 SentenceShortsModal，不展开面板
//     若内容还没加载，先 loading 一次再弹，之后缓存复用

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Typography, Collapse, Spin, Modal } from 'antd';
import { getCourseBaseUrl, getCourseDataUrl } from '../../utils/coursePath';
import { safeJsonFetch } from '../../utils/safeFetch';
import { applyVoiceSettings } from '../../utils/speech';
import { useLocale } from '../../store/LocaleContext';
import { useAuth } from '../../store/AuthContext';
import { useProgress } from '../EnglishWord/hooks/useProgress';
import WordStatusButton from '../EnglishWord/components/WordStatusButton';
import StatusFilter, { type StatusFilterValue } from '../EnglishWord/components/StatusFilter';
import ProgressButtons from '../EnglishWord/components/ProgressButtons';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { BasicEnglishData, Chapter, LessonItem } from './types';
import LessonLearnModal from './components/LessonLearnModal';
import LessonQuizModal from './components/LessonQuizModal';
import SentenceShortsModal from './components/SentenceShortsModal';

const { Title, Paragraph } = Typography;

const COURSE_ID = 'BasicEnglish300';
const BASIC_ENGLISH_COURSE = 'BasicEnglish300';
const CHAPTER_CACHE_PREFIX = 'be300_chapter_';

interface BasicEnglish300Props {
  onExit?: () => void;
}

type RuntimeChapter = Omit<Chapter, 'items'> & {
  chapterNum: number;
  items?: LessonItem[];
};

const chapterItems = (c: RuntimeChapter | undefined): LessonItem[] => c?.items ?? [];

function withGroup<T extends LessonItem>(item: T, group: string): T & { group: string } {
  return { ...item, group };
}

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

const BasicEnglish300: React.FC<BasicEnglish300Props> = () => {
  const { t } = useLocale();
  const { user, token, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  const [data, setData] = useState<BasicEnglishData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ★ 统一 loading：面板展开加载 / 短片预加载共用这一个遮罩
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterLoadingText, setChapterLoadingText] = useState('');
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  const [learnOpen, setLearnOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [shorts, setShorts] = useState<{ lessons: LessonItem[]; chapterName: string } | null>(null);

  const preloadedChaptersRef = useRef<Set<number>>(new Set());

  const {
    progressLoaded,
    syncing,
    downloadProgress,
    uploadProgress,
    toggleWordStatus,
    getWordStatus,
    setWordStatus,
    loadFromLocal,
  } = useProgress({
    userId: user?.id,
    token,
    isAuthenticated,
    course: BASIC_ENGLISH_COURSE,
  });

  useEffect(() => {
    loadFromLocal();
  }, [loadFromLocal]);

  // ────────────────────────────────────────────────────────
  // 首屏：只拉 data.json
  // ────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────
  // 拉章节 sentences（localStorage 缓存 + contentLink 守卫）
  // ────────────────────────────────────────────────────────
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
      /* 缓存损坏忽略 */
    }

    const file = chapter.contentLink;
    if (!file) {
      console.warn(`[跳过] 章节 "${chapter.name}" 没有 contentLink`);
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
          try {
            rawItems = JSON.parse(text);
          } catch {
            /* 非 json */
          }
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
      /* 容量满忽略 */
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

  // ────────────────────────────────────────────────────────
  // ★ 播放（面板内句子点击）
  // ────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────
  // ★ 点章节标题：展开/收起 + 懒加载该章内容
  // ────────────────────────────────────────────────────────
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

    // 收起
    if (activeKeys.includes(lastKey)) {
      setActiveKeys(arr.filter((k) => k !== lastKey));
      return;
    }

    // 首次展开：加载内容 + 核心音图
    if (!chapterItems(target).length && !preloadedChaptersRef.current.has(chapterNum)) {
      preloadedChaptersRef.current.add(chapterNum);
      setChapterLoading(true);
      setChapterLoadingText(`正在加载「${target.name}」...`);

      try {
        const items = await loadChapterContent(target);

        const audioUrls = new Set<string>();
        const imgUrls: string[] = [];
        for (const item of items.slice(0, 15)) {
          buildAudioUrls(target, item, 'en').forEach((u) => audioUrls.add(u));
          buildAudioUrls(target, item, 'zh').forEach((u) => audioUrls.add(u));
          const imgUrl = resolveImageUrl(item.lessonImage);
          if (imgUrl) imgUrls.push(imgUrl);
        }

        const coreAudio = Array.from(audioUrls).slice(0, 6);
        const coreImg = imgUrls.slice(0, 3);
        setChapterLoadingText(
          `正在准备音频与图片 (${coreAudio.length} 个音频, ${coreImg.length} 张图)...`,
        );
        await Promise.allSettled([
          ...coreAudio.map((u) => audioPreloader.preload(u)),
          ...coreImg.map((u) => preloadImage(u)),
        ]);

        setChapterLoading(false);
        setActiveKeys([lastKey]);

        const remainingAudio = Array.from(audioUrls).slice(6);
        const remainingImg = imgUrls.slice(3);
        setTimeout(() => {
          audioPreloader.enqueue(remainingAudio);
          for (const src of remainingImg) {
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

  // ────────────────────────────────────────────────────────
  // ★ 点「▶ 短片」：直接弹短片模态框，不展开面板
  // ────────────────────────────────────────────────────────
  const handleShortsClick = async (chapter: RuntimeChapter) => {
    const items = chapterItems(chapter);
    if (items.length === 0) {
      // 内容还没加载：先加载（用同一套遮罩），再弹
      setChapterLoading(true);
      setChapterLoadingText(`正在准备「${chapter.name}」短片...`);
      try {
        const loaded = await loadChapterContent(chapter);
        setChapterLoading(false);
        setShorts({ lessons: loaded, chapterName: chapter.name });
      } catch {
        setChapterLoading(false);
        setShorts({ lessons: [], chapterName: chapter.name });
      }
    } else {
      setShorts({ lessons: items, chapterName: chapter.name });
    }
  };

  // ────────────────────────────────────────────────────────
  // 派生数据
  // ────────────────────────────────────────────────────────
  const allLessons = useMemo(
    () =>
      (data?.chapters ?? []).flatMap((c) => {
        const chapter = c as RuntimeChapter;
        return chapterItems(chapter).map((i) => ({
          lesson: adaptItem(i),
          chapter,
        }));
      }),
    [data],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilterValue, number> = { all: 0, pending: 0, learning: 0, mastered: 0 };
    for (const { lesson, chapter } of allLessons) {
      counts[getWordStatus(withGroup(lesson, chapter.name))] += 1;
      counts.all += 1;
    }
    return counts;
  }, [allLessons, getWordStatus]);

  const learningLessons = useMemo(
    () =>
      allLessons
        .filter(
          ({ lesson, chapter }) =>
            getWordStatus(withGroup(lesson, chapter.name)) === 'learning',
        )
        .map(({ lesson }) => adaptItem(lesson)),
    [allLessons, getWordStatus],
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin description="加载中..." />
      </div>
    );
  }
  if (loadError) {
    return (
      <div style={{ padding: 24, color: '#d93025' }}>
        <h3>数据加载失败</h3>
        <p>{loadError}</p>
      </div>
    );
  }
  if (!data) return null;

  const actionButtonStyle = {
    padding: '6px 14px',
    fontSize: 13,
    borderRadius: 99,
    border: '1px solid #d0d0d0',
    background: '#fff',
    color: '#333',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as const;

  return (
    <div style={{ padding: isMobile ? 14 : 20, maxWidth: 900, margin: '0 auto' }}>
      {/* ★ 共用加载遮罩 */}
      <Modal
        open={chapterLoading}
        footer={null}
        closable={false}
        maskClosable={false}
        width={isMobile ? 300 : 400}
        styles={{ body: { textAlign: 'center', padding: '32px 24px' } }}
      >
        <Spin size="large" />
        <div style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
          {chapterLoadingText}
        </div>
      </Modal>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <ProgressButtons isAuthenticated={isAuthenticated} progressLoaded={progressLoaded} syncing={syncing} onDownload={downloadProgress} onUpload={uploadProgress} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 4 }}>{data.title}</Title>
        <Paragraph italic style={{ color: '#888', fontSize: 16, marginBottom: 0 }}>{data.titleEn}</Paragraph>
      </div>

      {allLessons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: isMobile ? 'center' : 'space-between', marginBottom: 18 }}>
          <StatusFilter value={statusFilter} counts={statusCounts} onChange={setStatusFilter} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { if (learningLessons.length >= 1) setLearnOpen(true); else alert(t('basicenglish300.learnEmpty') || '没有学习中状态的句子'); }} style={{ ...actionButtonStyle, opacity: learningLessons.length >= 1 ? 1 : 0.5, cursor: learningLessons.length >= 1 ? 'pointer' : 'not-allowed' }}>
              {t('basicenglish300.learnButton') || '句子学习'}
            </button>
            <button onClick={() => { if (learningLessons.length >= 1) setQuizOpen(true); else alert(t('basicenglish300.quizEmpty') || '学习中的句子不足，无法测验'); }} style={{ ...actionButtonStyle, opacity: learningLessons.length >= 1 ? 1 : 0.5, cursor: learningLessons.length >= 1 ? 'pointer' : 'not-allowed' }}>
              {t('basicenglish300.quizButton') || '测验'}
            </button>
          </div>
        </div>
      )}

      <Collapse
        activeKey={activeKeys}
        accordion={false}
        onChange={handleCollapseChange}
        style={{ background: 'transparent', border: 'none' }}
        items={(data.chapters as RuntimeChapter[]).map((chapter) => {
          const items = chapterItems(chapter);
          const visibleItems = items
            .map((i) => adaptItem(i))
            .filter((item) =>
              statusFilter === 'all'
                ? true
                : getWordStatus(withGroup(item, chapter.name)) === statusFilter,
            );

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
                  // ★ 短片按钮：只弹短片，不再触发 handleCollapseChange
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShortsClick(chapter);
                    }}
                    style={{ ...actionButtonStyle, padding: '5px 13px', fontSize: 13, alignSelf: 'center', flexShrink: 0, whiteSpace: 'nowrap' }}
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
                {t('basicenglish300.filterNoMatch') || '没有符合筛选条件的句子'}
              </div>
            ) : (
              <Card style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, background: '#fff', overflow: 'hidden' }}>
                  {visibleItems.map((item, itemIndex) => {
                    const status = getWordStatus(withGroup(item, chapter.name));
                    const imageUrl = resolveImageUrl(item.lessonImage);
                    return (
                      <div key={`${chapter.name}-${itemIndex}-${item.en}`} style={isMobile ? { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: '12px 14px', borderBottom: itemIndex < visibleItems.length - 1 ? '1px solid #f0f0f0' : 'none' } : { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: itemIndex < visibleItems.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                        {imageUrl ? (
                          <img src={imageUrl} alt={item.en} style={isMobile ? { width: '100%', height: 150, borderRadius: 6, objectFit: 'cover', background: '#f5f5f5' } : { width: 96, height: 96, borderRadius: 6, objectFit: 'cover', flexShrink: 0, background: '#f5f5f5' }} />
                        ) : (
                          <div style={isMobile ? { height: 150 } : { width: 96, height: 96, flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div onClick={() => playAudio(chapter, item, 'zh')} style={{ fontSize: isMobile ? 17 : 15, color: '#222', fontWeight: 500, cursor: item.name ? 'pointer' : 'default', userSelect: 'none' }} title="点击朗读中文">{item.name}</div>
                          <div onClick={() => playAudio(chapter, item, 'en')} style={{ fontSize: isMobile ? 14 : 13, color: '#666', marginTop: 4, cursor: item.en ? 'pointer' : 'default', userSelect: 'none' }} title="点击朗读英文">{item.en}</div>
                        </div>
                        <WordStatusButton status={status} progressLoaded={progressLoaded} onClick={() => toggleWordStatus(withGroup(item, chapter.name))} style={isMobile ? { width: '100%', marginTop: 2, whiteSpace: 'nowrap' } : { width: 'auto', flexShrink: 0, marginTop: 0, whiteSpace: 'nowrap' }} />
                      </div>
                    );
                  })}
                </div>
              </Card>
            ),
          };
        })}
      />

      <LessonLearnModal lessons={learningLessons} open={learnOpen} onClose={() => setLearnOpen(false)} />
      <LessonQuizModal
        lessons={allLessons.map((x) => x.lesson)}
        getLessonStatus={(item) => { const found = allLessons.find((x) => x.lesson === item); return getWordStatus(withGroup(item, found?.chapter.name ?? '')); }}
        setLessonStatus={(item, s) => { const found = allLessons.find((x) => x.lesson === item); setWordStatus(withGroup(item, found?.chapter.name ?? ''), s); }}
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
      />

      {/* ★ 短片弹窗 */}
      <SentenceShortsModal
        lessons={shorts?.lessons ?? []}
        resolveImageUrl={resolveImageUrl}
        chapterName={shorts?.chapterName}
        open={shorts !== null}
        onClose={() => setShorts(null)}
      />
    </div>
  );
};

export default BasicEnglish300;