// client/src/books/EnglishShorts/EnglishShorts.tsx

/**
 * 英文短句 —— native 脱口而出的两三词口语反应。
 *
 * 跟 BasicEnglish300 的区别要说清楚，不然容易做混：
 *   那边是「教你怎么说一件事」的完整祈使句（Change into your slippers first.），配了场景插图；
 *   这边是「听到就反应得过来」的极短口语（Keep it up. / No rush. / Hold on.），没有图，
 *   重点放在听音、跟读、成组连播上。所以呈现方式也不一样：不搞翻卡，直接铺开卡片点读。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCourseDataUrl, getCourseContentUrl } from '../../utils/coursePath';
import { useLocale } from '../../store/LocaleContext';
import { useAuth } from '../../store/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { speak, type SpeakHandle } from '../../utils/speech';
// 进度追踪直接复用单词书那套：pending / learning / mastered，登录后同样会同步到服务器
import { useProgress } from '../EnglishWord/hooks/useProgress';
import ShortQuizModal, { type QuizItem } from './components/ShortQuizModal';
// 状态徽标和筛选器直接复用单词书那两个，行为、配色、文案都跟那边保持一致
import StatusFilter, { type StatusFilterValue } from '../EnglishWord/components/StatusFilter';
import WordStatusButton from '../EnglishWord/components/WordStatusButton';
import ProgressButtons from '../EnglishWord/components/ProgressButtons';
import type { EnglishShortsData, ShortGroup, ShortItem } from './types';

const COURSE_ID = 'EnglishShorts';

/** 慢速档。正常语速由用户在设置里自己定，这里只压低，不覆盖全局设置 */
const SLOW_RATE = 0.62;

/** 连播时句与句之间留的间隔。不留的话两句粘在一起，听不出哪句是哪句 */
const GAP_MS = 650;

interface EnglishShortsProps {
  onExit?: () => void;
}

const EnglishShorts: React.FC<EnglishShortsProps> = () => {
  const { t } = useLocale();
  const { user, token, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  const {
    getWordStatus,
    setWordStatus,
    toggleWordStatus,
    loadFromLocal,
    progressLoaded,
    localProgress,
    syncing,
    downloadProgress,
    uploadProgress,
  } = useProgress({
    userId: user?.id,
    token,
    isAuthenticated,
    course: COURSE_ID,
  });

  const [data, setData] = useState<EnglishShortsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showChinese, setShowChinese] = useState(true);
  const [slow, setSlow] = useState(false);
  /**
   * 展开的分组 id。默认全部收起 —— 17 组一次铺开要滚很久，
   * 收起来先看清有哪些类，再挑一个点开。
   */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  /** 正在朗读的卡片 key，形如 "friends-3" */
  const [activeKey, setActiveKey] = useState<string | null>(null);
  /** 连播时正在读第几句 / 共几句，用来显示进度 */
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);

  const handleRef = useRef<SpeakHandle | null>(null);
  const gapTimerRef = useRef<number | null>(null);
  const slowRef = useRef(slow);
  /**
   * 播放会话号。speak() 的 onEnd 在读完、出错、被取消时都会调用一次，
   * 连播时如果不等这一个会话结束就切歌，旧回调会把进度表带跑偏。
   * 每次开启新播放就把号码 +1，回调里发现号码不对就直接忽略。
   */
  const sessionRef = useRef(0);

  useEffect(() => {
    slowRef.current = slow;
  }, [slow]);

 const load = useCallback(() => {
  setLoading(true);
  setError(null);
  fetch(getCourseDataUrl(COURSE_ID))
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(async (indexData: any) => {
      // 兼容旧格式（data.json.bak 那种直接带 groups + items）
      if (Array.isArray(indexData.groups) && indexData.groups[0]?.items) {
        setData(indexData as EnglishShortsData);
        return;
      }

      // 新格式：chapters + contentLink
      const chapters = indexData.chapters ?? [];
      const groups = await Promise.all(
        chapters.map(async (ch: any, idx: number) => {
          const linkName = ch.contentLink?.replace(/\.json$/, '') ?? `group-${idx}`;
          const fileUrl = getCourseContentUrl(COURSE_ID, linkName);
          try {
            const res = await fetch(fileUrl);
            if (!res.ok) {
              console.warn(`Failed to load ${fileUrl}: HTTP ${res.status}`);
              return {
                id: linkName,
                name: ch.name ?? '',
                en: ch.en ?? '',
                icon: ch.icon ?? '🙇',
                items: [],
              };
            }
            const content = await res.json();
            // 兼容两种 content 格式：{items:[...]} 或直接 [...]
            const items = Array.isArray(content) ? content : (content.items ?? []);
            return {
              id: linkName,
              name: ch.name ?? '',
              en: ch.en ?? '',
              icon: ch.icon ?? '🙇',
              items,
            };
          } catch (e) {
            console.warn(`Error loading ${fileUrl}:`, e);
            return {
              id: linkName,
              name: ch.name ?? '',
              en: ch.en ?? '',
              icon: ch.icon ?? '🙇',
              items: [],
            };
          }
        })
      );

      setData({
        title: indexData.title ?? '英文短句',
        titleEn: indexData.titleEn ?? 'Everyday English Phrases',
        description: indexData.description ?? '',
        descriptionEn: indexData.descriptionEn ?? '',
        groups,
      } as EnglishShortsData);
    })
    .catch(e => {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    })
    .finally(() => setLoading(false));
}, []);

  useEffect(() => {
    load();
  }, [load]);

  // 进度存在本地（登录后还会同步到服务器），进页面先读一次
  useEffect(() => {
    loadFromLocal();
  }, [loadFromLocal]);

  /**
   * 登录着、且本地还是空的，就把服务器上的进度拉回来（换设备接着学）。
   *
   * 只在本地为空时拉：downloadProgress 是「整表替换」而不是合并，
   * 本地已经有进度时一拉，会被服务器上的空数据整个盖掉。
   * 只尝试一次 —— 否则服务器也是空的时候，新对象引用会让这个 effect 反复触发。
   */
  const triedDownloadRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || !progressLoaded || triedDownloadRef.current) return;
    if (Object.keys(localProgress).length > 0) return;
    triedDownloadRef.current = true;
    downloadProgress();
  }, [isAuthenticated, progressLoaded, localProgress, downloadProgress]);

  /**
   * 测验收卷后自动上传。
   *
   * 不能直接在收卷那一刻调 uploadProgress —— 它读的是 localProgress 状态，
   * 而 setWordStatus 的更新还没落进去，上传的会是改之前的老数据。
   * 这里改成「打个标记 → 等进度真的更新完 → 再上传」，
   * 两次 setState 在同一批里，下一次渲染拿到的就是新的 uploadProgress。
   */
  const [uploadTick, setUploadTick] = useState(0);
  useEffect(() => {
    if (!uploadTick) return;
    uploadProgress();
  }, [uploadTick, uploadProgress]);

  const [synced, setSynced] = useState<number | null>(null);

  const handleQuizFinish = useCallback((correct: number) => {
    setUploadTick(t => t + 1);
    setSynced(correct);
  }, []);

  // 离开时把还在排队的朗读和计时器清干净，免得切出去了还在念
  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      handleRef.current?.cancel();
      if (gapTimerRef.current) window.clearTimeout(gapTimerRef.current);
    };
  }, []);

  const fmt = (key: string, vars: Record<string, string | number> = {}) =>
    t(key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

  const clearTimers = () => {
    if (gapTimerRef.current) {
      window.clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    sessionRef.current += 1;
    handleRef.current?.cancel();
    handleRef.current = null;
    clearTimers();
    setActiveKey(null);
    setProgress(null);
  }, []);

  /** 连播队列：[{item, key}, ...]，读到的位置由 caller 维护 */
  const queueRef = useRef<Array<{ item: ShortItem; key: string }> | null>(null);

  const speakOne = useCallback(
    (item: ShortItem, key: string, session: number, idx: number, total: number) => {
      handleRef.current = speak({
        text: item.en,
        lang: 'en-US',
        rate: slowRef.current ? SLOW_RATE : undefined,
        onStart: () => {
          if (sessionRef.current !== session) return;
          setActiveKey(key);
          setProgress(total > 1 ? { i: idx + 1, n: total } : null);
        },
        onEnd: () => {
          // 号码对不上说明期间已经切到别的播放了，这个回调是过期的
          if (sessionRef.current !== session) return;
          const q = queueRef.current;
          const nextIdx = idx + 1;
          if (!q || nextIdx >= q.length) {
            queueRef.current = null;
            setActiveKey(null);
            setProgress(null);
            handleRef.current = null;
            return;
          }
          // 句间留一点空白，不然连播听起来像一长串
          gapTimerRef.current = window.setTimeout(() => {
            if (sessionRef.current !== session) return;
            const next = q[nextIdx];
            speakOne(next.item, next.key, session, nextIdx, q.length);
          }, GAP_MS);
        },
      });
    },
    []
  );

  // ── 句子清单与筛选 ──
  // 这块必须放在 playGroup / playItem 之前：它们的依赖数组引用了 visibleIn，
  // const 声明有暂时性死区，放在后面会直接 ReferenceError（白屏）。
  /** 各组句子补上 group 字段，useProgress 用它派生 key（`${group}|${en}`） */
  const quizItemsByGroup = useMemo(() => {
  const m: Record<string, QuizItem[]> = {};
  data?.groups?.forEach?.(g => {        // ← 改成可选链
    m[g.id] = g.items.map(it => ({ ...it, group: g.id }));
  });
  return m;
}, [data]);

  const allQuizItems = useMemo(
    () => (data ? data.groups.flatMap(g => g.items.map(it => ({ ...it, group: g.id }))) : []),
    [data]
  );

  /** 顶部筛选：全部 / 待学习 / 学习中 / 已学会 */
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');

  /** 某一组在当前筛选下真正要显示的句子 */
  const visibleIn = useCallback(
    (gid: string): QuizItem[] => {
      const list = quizItemsByGroup[gid] ?? [];
      if (statusFilter === 'all') return list;
      return list.filter(it => getWordStatus(it) === statusFilter);
    },
    [quizItemsByGroup, statusFilter, getWordStatus]
  );

  /** 念单句 */
  const playItem = useCallback(
    (item: ShortItem, key: string) => {
      stop();
      const session = sessionRef.current;
      queueRef.current = null;
      speakOne(item, key, session, 0, 1);
    },
    [stop, speakOne]
  );

  /** 整组连播 */
  const playGroup = useCallback(
    (group: ShortGroup) => {
      stop();
      // 收起状态下点连播，顺手把它展开 —— 不然高亮在哪一张根本看不见
      setExpandedIds(prev => (prev.has(group.id) ? prev : new Set(prev).add(group.id)));
      const session = sessionRef.current;
      // key 用英文原文而不是下标：筛选过后下标会变，
      // 跟卡片上的对不上，正在读的那张就高亮不上了
      const q = visibleIn(group.id).map(item => ({
        item,
        key: `${group.id}-${item.en}`,
      }));
      queueRef.current = q;
      if (q.length === 0) return;
      speakOne(q[0].item, q[0].key, session, 0, q.length);
    },
    [stop, speakOne, visibleIn]
  );

  /** 全部连播 */
 const playAll = useCallback(() => {
  if (!data?.groups) return;            // ← 改这里
  stop();
  setExpandedIds(new Set(data.groups.map(g => g.id)));
  const session = sessionRef.current;
  const q = data.groups.flatMap(g =>
    g.items.map(item => ({ item, key: `${g.id}-${item.en}` }))
  );
  queueRef.current = q;
  if (q.length === 0) return;
  speakOne(q[0].item, q[0].key, session, 0, q.length);
}, [data, stop, speakOne]);

  /** 展开 / 收起某一组 */
  const toggleGroup = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** 一次全部展开或全部收起 */
  const setAllExpanded = useCallback(
    (expand: boolean) => {
      if (!data) return;
      setExpandedIds(expand ? new Set(data.groups.map(g => g.id)) : new Set());
    },
    [data]
  );

  const totalCount = data?.groups.reduce((s, g) => s + g.items.length, 0) ?? 0;

  // ── 测验 ──
  /** 'all' = 全书；否则是某个分组的 id */
  const [quizScope, setQuizScope] = useState('all');
  const [quizOpen, setQuizOpen] = useState(false);

  const openQuiz = useCallback(
    (scope: string) => {
      stop(); // 别让连播跟测验抢嘴
      setSynced(null);
      setQuizScope(scope);
      setQuizOpen(true);
    },
    [stop]
  );

  const quizItems = quizScope === 'all' ? allQuizItems : quizItemsByGroup[quizScope] ?? [];
  const quizName = useMemo(() => {
    if (quizScope === 'all') return `💬 ${t('englishShorts.title')}`;
    const g = data?.groups.find(x => x.id === quizScope);
    return g ? `${g.icon} ${g.name}` : '';
  }, [quizScope, data, t]);

  /** 某一组里已经学会多少句 */
  const learnedIn = useCallback(
    (gid: string) =>
      (quizItemsByGroup[gid] ?? []).filter(it => getWordStatus(it) === 'mastered').length,
    [quizItemsByGroup, getWordStatus]
  );

  /** 筛选按钮上的计数，按全书算 */
  const statusCounts = useMemo(() => {
    const c: Record<StatusFilterValue, number> = {
      all: allQuizItems.length,
      pending: 0,
      learning: 0,
      mastered: 0,
    };
    allQuizItems.forEach(it => {
      c[getWordStatus(it)] += 1;
    });
    return c;
  }, [allQuizItems, getWordStatus]);

  const buttonBase: React.CSSProperties = {
    border: '1px solid #d9d9d9',
    background: '#fff',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 14,
    cursor: 'pointer',
    lineHeight: 1.4,
  };

  const toggleOn: React.CSSProperties = {
    ...buttonBase,
    background: '#e6f4ff',
    borderColor: '#91caff',
    color: '#0958d9',
    fontWeight: 500,
  };

  // ── 登录门禁 ──
  // 这本书的核心是「记住你每句学会没有」，不登录就谈不上个人进度，
  // 所以直接挡在门口，而不是让它退化成一个只能看不能记的只读列表。
  
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: isMobile ? '14px 12px 40px' : '20px 16px 48px',
        background: 'linear-gradient(180deg,#f7fbff 0%,#fdf7f0 100%)',
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* 顶栏 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                💬 {t('englishShorts.title')}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: '#0958d9',
                    background: '#e6f4ff',
                    borderRadius: 10,
                    padding: '2px 10px',
                  }}
                >
                  {fmt('englishShorts.totalCount', { n: totalCount })}
                </span>
              </h1>
              <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                {t('englishShorts.description')}
              </div>
            </div>
            {/* 返回书籍统一放在头部最右（固定不随页面滚动），这里不再重复放一个 */}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* 两个按钮常驻，跟 EnglishWord 的做法一致：不用先猜当前是展开还是收起 */}
            <button
              onClick={() => setAllExpanded(true)}
              style={buttonBase}
              disabled={!data}
            >
              {t('englishShorts.expandAll')}
            </button>
            <button
              onClick={() => setAllExpanded(false)}
              style={buttonBase}
              disabled={!data}
            >
              {t('englishShorts.collapseAll')}
            </button>
            <button
              onClick={() => setShowChinese(v => !v)}
              style={showChinese ? toggleOn : buttonBase}
            >
              {t('englishShorts.showChinese')}
            </button>
            <button onClick={() => setSlow(v => !v)} style={slow ? toggleOn : buttonBase}>
              🐢 {t('englishShorts.slow')}
            </button>
            <button onClick={playAll} style={toggleOn} disabled={!data}>
              ▶ {t('englishShorts.playAll')}
            </button>
            <button onClick={stop} style={buttonBase}>
              ■ {t('englishShorts.stop')}
            </button>
            <button onClick={() => openQuiz('all')} style={buttonBase} disabled={!data}>
              ✏️ {t('englishShorts.quizAll')}
            </button>
          </div>
        </div>

        {!loading && !error && data && (
          <div
            style={{
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              // 窄屏放不下「筛选器 + 下载/上传」横排，居中折行更自然
              justifyContent: isMobile ? 'center' : 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <StatusFilter
              value={statusFilter}
              counts={statusCounts}
              onChange={setStatusFilter}
            />
            <ProgressButtons
              isAuthenticated={isAuthenticated}
              progressLoaded={progressLoaded}
              syncing={syncing}
              onDownload={downloadProgress}
              onUpload={uploadProgress}
            />
          </div>
        )}

        {progress && (
          <div
            style={{
              marginBottom: 12,
              padding: '8px 14px',
              background: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: 8,
              fontSize: 14,
              color: '#ad6800',
            }}
          >
            🔊 {fmt('englishShorts.playing', { i: progress.i, n: progress.n })}
          </div>
        )}

        {synced !== null && (
          <div
            style={{
              marginBottom: 12,
              padding: '8px 14px',
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 8,
              fontSize: 14,
              color: '#389e0d',
            }}
          >
            ✅ {fmt('englishShorts.quizUploaded', { n: synced })}
          </div>
        )}

        {loading && <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>{t('englishShorts.loading')}</div>}

        {error && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ color: '#cf1322', marginBottom: 12 }}>
              {t('englishShorts.loadFailed')}：{error}
            </div>
            <button onClick={load} style={buttonBase}>
              {t('englishShorts.retry')}
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div style={{ color: '#aaa', fontSize: 13, marginBottom: 14 }}>
              {t('englishShorts.clickToPlay')}
            </div>

            {data.groups.map(group => {
              const open = expandedIds.has(group.id);
              const groupItems = visibleIn(group.id);
              // 筛选后这组一个不剩，就整组藏起来，不留空壳
              if (groupItems.length === 0) return null;
              return (
              <section
                key={group.id}
                style={{
                  marginBottom: 12,
                  border: '1px solid #e8e8e8',
                  borderRadius: 12,
                  background: '#fff',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={
                    isMobile
                      ? {
                          // 手机上标题 + 两个按钮挤一行根本放不下，改成上下两层：
                          // 上面标题（内部还允许换行），下面两个按钮各占一半宽。
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          gap: 10,
                          padding: '12px 14px',
                        }
                      : {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px 16px',
                        }
                  }
                >
                  <button
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={open}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      // 这一行元素太多（图标/中文名/英文名/句数/已学会），
                      // 窄屏硬塞会全挤一起，允许折到第二行
                      flexWrap: 'wrap',
                      gap: isMobile ? 6 : 10,
                      flex: 1,
                      minWidth: 0,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ color: '#999', fontSize: 14, width: 12 }}>
                      {open ? '▾' : '▸'}
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 600, color: '#1f1f1f' }}>
                      {group.icon} {group.name}
                    </span>
                    <span style={{ color: '#aaa', fontSize: 13 }}>{group.en}</span>
                    <span style={{ color: '#bbb', fontSize: 12 }}>
                      {fmt('englishShorts.groupCount', { n: groupItems.length })}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: learnedIn(group.id) > 0 ? '#389e0d' : '#ccc',
                      }}
                    >
                      ✓{' '}
                      {fmt('englishShorts.learnedCount', {
                        n: learnedIn(group.id),
                        total: group.items.length,
                      })}
                    </span>
                  </button>
                  {/* 两个按钮包一层：手机上整排挪到标题下面，各占一半宽更好点 */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => playGroup(group)}
                      style={{
                        ...buttonBase,
                        padding: '4px 12px',
                        fontSize: 13,
                        flex: isMobile ? 1 : undefined,
                      }}
                    >
                      ▶ {t('englishShorts.playGroup')}
                    </button>
                    <button
                      onClick={() => openQuiz(group.id)}
                      style={{
                        ...buttonBase,
                        padding: '4px 12px',
                        fontSize: 13,
                        flex: isMobile ? 1 : undefined,
                      }}
                    >
                      ✏️ {t('englishShorts.quizGroup')}
                    </button>
                  </div>
                </div>

                {open && (
                <div
                  style={{
                    display: 'grid',
                    // 手机上固定单列：auto-fill + 184px 最小值在小屏上会算出
                    // 忽宽忽窄的列宽，不如直接铺满
                    gridTemplateColumns: isMobile
                      ? '1fr'
                      : 'repeat(auto-fill,minmax(184px,1fr))',
                    gap: 12,
                    padding: isMobile ? '0 14px 14px' : '0 16px 16px',
                  }}
                >
                  {groupItems.map(item => {
                    const key = `${group.id}-${item.en}`;
                    const active = activeKey === key;
                    const status = getWordStatus(item);
                    return (
                      <div
                        key={key}
                        onClick={() => playItem(item, key)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          playItem(item, key);
                        }}
                        style={{
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          padding: isMobile ? '16px 14px' : '14px 16px',
                          borderRadius: 12,
                          border: active ? '2px solid #1677ff' : '1px solid #e8e8e8',
                          background: active ? '#f0f7ff' : '#fff',
                          boxShadow: active
                            ? '0 6px 18px rgba(22,119,255,.18)'
                            : '0 1px 3px rgba(0,0,0,.05)',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'transform .12s, box-shadow .12s, border-color .12s',
                          transform: active ? 'translateY(-2px)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            // 手机上放大一号，窄屏里 16px 的英文读着偏挤
                            fontSize: isMobile ? 17 : 16,
                            fontWeight: 600,
                            color: active ? '#0958d9' : '#1f1f1f',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.en}
                        </div>
                        {showChinese && (
                          <div
                            style={{
                              fontSize: isMobile ? 14 : 13,
                              color: '#888',
                              marginTop: 6,
                              lineHeight: 1.4,
                            }}
                          >
                            {item.name}
                          </div>
                        )}
                        {/* 外面包一层拦住冒泡：不然点状态按钮会顺带把卡片也点了，变成朗读 */}
                        <span
                          onClick={e => e.stopPropagation()}
                          style={{ marginTop: 'auto', paddingTop: 10, display: 'block' }}
                        >
                          <WordStatusButton
                            status={status}
                            progressLoaded={progressLoaded}
                            onClick={() => toggleWordStatus(item)}
                            style={{
                              width: 'auto',
                              marginTop: 0,
                              padding: '3px 12px',
                              fontSize: 12,
                            }}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
                )}
              </section>
              );
            })}
          </>
        )}

        <ShortQuizModal
          items={quizItems}
          getStatus={getWordStatus}
          setStatus={setWordStatus}
          scopeName={quizName}
          open={quizOpen}
          onClose={() => setQuizOpen(false)}
          onFinish={handleQuizFinish}
        />
      </div>
    </div>
  );
};

export default EnglishShorts;
