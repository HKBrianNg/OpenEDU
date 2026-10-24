// client/src/books/EnglishShorts/EnglishShorts.tsx

/**
 * 英文短句 —— native 脱口而出的两三词口语反应。
 *
 * 跟 BasicEnglish300 的区别要说清楚，不然容易做混：
 *   那边是「教你怎么说一件事」的完整祈使句（Change into your slippers first.），配了场景插图；
 *   这边是「听到就反应得过来」的极短口语（Keep it up. / No rush. / Hold on.），没有图，
 *   重点放在听音、跟读、成组连播上。所以呈现方式也不一样：不搞翻卡，直接铺开卡片点读。
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getCourseDataUrl } from '../../utils/coursePath';
import { safeJsonFetch } from '../../utils/safeFetch';
import { useLocale } from '../../store/LocaleContext';
import { speak, type SpeakHandle } from '../../utils/speech';
import type { EnglishShortsData, ShortGroup, ShortItem } from './types';

const COURSE_ID = 'EnglishShorts';

/** 慢速档。正常语速由用户在设置里自己定，这里只压低，不覆盖全局设置 */
const SLOW_RATE = 0.62;

/** 连播时句与句之间留的间隔。不留的话两句粘在一起，听不出哪句是哪句 */
const GAP_MS = 650;

interface EnglishShortsProps {
  onExit?: () => void;
}

const EnglishShorts: React.FC<EnglishShortsProps> = ({ onExit }) => {
  const { t } = useLocale();

  const [data, setData] = useState<EnglishShortsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showChinese, setShowChinese] = useState(true);
  const [slow, setSlow] = useState(false);

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
    safeJsonFetch<EnglishShortsData>(getCourseDataUrl(COURSE_ID))
      .then(d => setData(d))
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      const session = sessionRef.current;
      const q = group.items.map((item, i) => ({
        item,
        key: `${group.id}-${i}`,
      }));
      queueRef.current = q;
      if (q.length === 0) return;
      speakOne(q[0].item, q[0].key, session, 0, q.length);
    },
    [stop, speakOne]
  );

  /** 全部连播 */
  const playAll = useCallback(() => {
    if (!data) return;
    stop();
    const session = sessionRef.current;
    const q = data.groups.flatMap(g =>
      g.items.map((item, i) => ({ item, key: `${g.id}-${i}` }))
    );
    queueRef.current = q;
    if (q.length === 0) return;
    speakOne(q[0].item, q[0].key, session, 0, q.length);
  }, [data, stop, speakOne]);

  const totalCount = data?.groups.reduce((s, g) => s + g.items.length, 0) ?? 0;

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
            {onExit && (
              <button onClick={onExit} style={buttonBase}>
                ← {t('englishShorts.backToLobby')}
              </button>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
                💬 {t('englishShorts.title')}
              </h1>
              <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                {t('englishShorts.description')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: '#999', fontSize: 13 }}>
              {fmt('englishShorts.totalCount', { n: totalCount })}
            </span>
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
          </div>
        </div>

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

            {data.groups.map(group => (
              <section key={group.id} style={{ marginBottom: 26 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
                    {group.icon} {group.name}
                  </h2>
                  <span style={{ color: '#aaa', fontSize: 13 }}>{group.en}</span>
                  <span style={{ color: '#bbb', fontSize: 12 }}>
                    {fmt('englishShorts.groupCount', { n: group.items.length })}
                  </span>
                  <button
                    onClick={() => playGroup(group)}
                    style={{ ...buttonBase, padding: '4px 12px', fontSize: 13 }}
                  >
                    ▶ {t('englishShorts.playGroup')}
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(184px,1fr))',
                    gap: 12,
                  }}
                >
                  {group.items.map((item, i) => {
                    const key = `${group.id}-${i}`;
                    const active = activeKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => playItem(item, key)}
                        style={{
                          textAlign: 'left',
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
                          <div style={{ fontSize: 13, color: '#888', marginTop: 6, lineHeight: 1.4 }}>
                            {item.name}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default EnglishShorts;
