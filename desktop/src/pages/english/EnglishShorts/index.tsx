// desktop/src/pages/english/EnglishShorts/index.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCourseDataUrl, getCourseContentUrl } from '../../../utils/coursePath';
import { useLocale } from '../../../store/LocaleContext';
import { useAuth } from '../../../store/AuthContext';
import { speak, type SpeakHandle } from '../../../utils/speech';
import { useProgress } from '../EnglishWord/hooks/useProgress';
import ShortQuizModal, { type QuizItem } from './components/ShortQuizModal';
import StatusFilter, { type StatusFilterValue } from '../EnglishWord/components/StatusFilter';
import WordStatusButton from '../EnglishWord/components/WordStatusButton';
import ProgressButtons from '../EnglishWord/components/ProgressButtons';
import type { EnglishShortsData, ShortGroup, ShortItem } from './types';
import './englishShorts.css';

const COURSE_ID = 'EnglishShorts';

const SLOW_RATE = 0.62;
const GAP_MS = 650;

export function EnglishShorts() {
  const { t } = useLocale();
  const { user, token, isAuthenticated } = useAuth();

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);

  const handleRef = useRef<SpeakHandle | null>(null);
  const gapTimerRef = useRef<number | null>(null);
  const slowRef = useRef(slow);
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
        if (Array.isArray(indexData.groups) && indexData.groups[0]?.items) {
          setData(indexData as EnglishShortsData);
          return;
        }

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

  useEffect(() => {
    loadFromLocal();
  }, [loadFromLocal]);

  const triedDownloadRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || !progressLoaded || triedDownloadRef.current) return;
    if (Object.keys(localProgress).length > 0) return;
    triedDownloadRef.current = true;
    downloadProgress();
  }, [isAuthenticated, progressLoaded, localProgress, downloadProgress]);

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

  const quizItemsByGroup = useMemo(() => {
    const m: Record<string, QuizItem[]> = {};
    data?.groups?.forEach?.(g => {
      m[g.id] = g.items.map(it => ({ ...it, group: g.id }));
    });
    return m;
  }, [data]);

  const allQuizItems = useMemo(
    () => (data ? data.groups.flatMap(g => g.items.map(it => ({ ...it, group: g.id }))) : []),
    [data]
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');

  const visibleIn = useCallback(
    (gid: string): QuizItem[] => {
      const list = quizItemsByGroup[gid] ?? [];
      if (statusFilter === 'all') return list;
      return list.filter(it => getWordStatus(it) === statusFilter);
    },
    [quizItemsByGroup, statusFilter, getWordStatus]
  );

  const playItem = useCallback(
    (item: ShortItem, key: string) => {
      stop();
      const session = sessionRef.current;
      queueRef.current = null;
      speakOne(item, key, session, 0, 1);
    },
    [stop, speakOne]
  );

  const playGroup = useCallback(
    (group: ShortGroup) => {
      stop();
      setExpandedIds(prev => (prev.has(group.id) ? prev : new Set(prev).add(group.id)));
      const session = sessionRef.current;
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

  const playAll = useCallback(() => {
    if (!data?.groups) return;
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

  const toggleGroup = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setAllExpanded = useCallback(
    (expand: boolean) => {
      if (!data) return;
      setExpandedIds(expand ? new Set(data.groups.map(g => g.id)) : new Set());
    },
    [data]
  );

  const totalCount = data?.groups.reduce((s, g) => s + g.items.length, 0) ?? 0;

  const [quizScope, setQuizScope] = useState('all');
  const [quizOpen, setQuizOpen] = useState(false);

  const openQuiz = useCallback(
    (scope: string) => {
      stop();
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

  const learnedIn = useCallback(
    (gid: string) =>
      (quizItemsByGroup[gid] ?? []).filter(it => getWordStatus(it) === 'mastered').length,
    [quizItemsByGroup, getWordStatus]
  );

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

  return (
    <div className="english-shorts-scroll">
      <div
        style={{
          minHeight: '100vh',
          padding: '20px 16px 48px',
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
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setAllExpanded(true)} style={buttonBase} disabled={!data}>
                {t('englishShorts.expandAll')}
              </button>
              <button onClick={() => setAllExpanded(false)} style={buttonBase} disabled={!data}>
                {t('englishShorts.collapseAll')}
              </button>
              <button onClick={() => setShowChinese(v => !v)} style={showChinese ? toggleOn : buttonBase}>
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
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <StatusFilter value={statusFilter} counts={statusCounts} onChange={setStatusFilter} />
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

          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
              {t('englishShorts.loading')}
            </div>
          )}

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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 16px',
                      }}
                    >
                      <button
                        onClick={() => toggleGroup(group.id)}
                        aria-expanded={open}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 10,
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
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => playGroup(group)}
                          style={{ ...buttonBase, padding: '4px 12px', fontSize: 13 }}
                        >
                          ▶ {t('englishShorts.playGroup')}
                        </button>
                        <button
                          onClick={() => openQuiz(group.id)}
                          style={{ ...buttonBase, padding: '4px 12px', fontSize: 13 }}
                        >
                          ✏️ {t('englishShorts.quizGroup')}
                        </button>
                      </div>
                    </div>

                    {open && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill,minmax(184px,1fr))',
                          gap: 12,
                          padding: '0 16px 16px',
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
                                padding: '14px 16px',
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
                                  fontSize: 16,
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
                                    fontSize: 13,
                                    color: '#888',
                                    marginTop: 6,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {item.name}
                                </div>
                              )}
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
    </div>
  );
}

EnglishShorts.displayName = 'EnglishShorts';