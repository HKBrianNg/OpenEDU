// client/src/books/EnglishShorts/components/ShortQuizModal.tsx

/**
 * 英文短句测验：显示中文并朗读，用户写出英文，当场判对错。
 *
 * 跟 BasicEnglish300 的 LessonQuizModal 不是一回事，那边是三卷（听音选句 / 认句选义 / 看中文写全句），
 * 这边的短句只有两三个词，做选择题没意义——直接写，写完立刻对答案。
 * 状态追踪复用 EnglishWord 那套 useProgress（pending / learning / mastered），
 * 所以「已学会」跟单词书、300 句是同一套存储，登录后也会同步到服务器。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '../../../store/LocaleContext';
import { speak } from '../../../utils/speech';
import type { WordStatus } from '../../EnglishWord/progressStorage';
import type { ShortItem } from '../types';

/** 短句加上所属分组 id，让 useProgress 的默认 key 派生（group|en）能把分组纳入 */
export type QuizItem = ShortItem & { group: string };

export interface ShortQuizModalProps {
  /** 被测范围里的句子，已带好 group 字段 */
  items: QuizItem[];
  getStatus: (item: QuizItem) => WordStatus;
  setStatus: (item: QuizItem, status: WordStatus) => void;
  /** 显示在标题上的范围名，例如「朋友闲聊」或「全部 430 句」 */
  scopeName: string;
  open: boolean;
  onClose: () => void;
  /** 收卷时回调，告诉外面这次答对了几句（外面拿它去上传进度） */
  onFinish?: (correctCount: number) => void;
}

type Phase = 'intro' | 'quiz' | 'result';

interface AnswerRecord {
  item: QuizItem;
  correct: boolean;
  userAnswer: string;
}

/** 一次测验的题量上限。范围小于这个数就全测 */
const QUIZ_SIZE = 10;

/** 答对后停多久自动进下一题。要留够时间让刚念的英文播完，又不至于让人干等 */
const AUTO_NEXT_MS = 1300;

/**
 * 判对错的归一化：大小写、标点、撇号（don't / dont）、多余空格都忽略。
 * 短句是口语，硬抠标点没意义，写 "dont worry" 也该算对。
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/'/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ShortQuizModal: React.FC<ShortQuizModalProps> = ({
  items,
  getStatus,
  setStatus,
  scopeName,
  open,
  onClose,
  onFinish,
}) => {
  const { t } = useLocale();

  const [phase, setPhase] = useState<Phase>('intro');
  const [pool, setPool] = useState<QuizItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<AnswerRecord[]>([]);
  const [marked, setMarked] = useState(0);
  /** 中文没读出来时为 true —— 引擎是静默失败，只能靠 speak() 的看门狗发现 */
  const [speechFailed, setSpeechFailed] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  /**
   * 答题记录另外存一份在 ref 里。setState 是异步的，而「答对后延时自动下一题」
   * 的定时器要立刻拿到包含刚这一题的完整记录 —— 这时候读 state 会漏掉最后一题。
   */
  const resultsRef = useRef<AnswerRecord[]>([]);
  const autoTimerRef = useRef<number | null>(null);

  const clearAutoTimer = () => {
    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  const fmt = (key: string, vars: Record<string, string | number> = {}) =>
    t(key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

  /** 还没学会的（mastered 之外都算） */
  const unlearned = useMemo(
    () => items.filter(it => getStatus(it) !== 'mastered'),
    [items, getStatus]
  );

  // 每次打开都从头开始，不留下上一轮的答案
  useEffect(() => {
    if (!open) return;
    setPhase('intro');
    setPool([]);
    setIdx(0);
    setInput('');
    setSubmitted(false);
    setResults([]);
    setMarked(0);
    resultsRef.current = [];
    clearAutoTimer();
  }, [open]);

  // 关掉弹窗时别把定时器留在后面，否则它会在看不见的地方翻题
  useEffect(() => clearAutoTimer, []);

  const start = useCallback(
    (onlyUnlearned: boolean) => {
      const src = onlyUnlearned ? unlearned : items;
      if (!src.length) return;
      clearAutoTimer();
      resultsRef.current = [];
      setPool(shuffle(src).slice(0, Math.min(QUIZ_SIZE, src.length)));
      setIdx(0);
      setInput('');
      setSubmitted(false);
      setResults([]);
      setMarked(0);
      setPhase('quiz');
    },
    [items, unlearned]
  );

  const current = pool[idx];

  // 切到新的一题就自动读一遍中文
  useEffect(() => {
    if (phase !== 'quiz' || !current) return;
    setSpeechFailed(false);
    speak({
      text: current.name,
      lang: 'zh-CN',
      onError: () => setSpeechFailed(true),
    });
    setInput('');
    setSubmitted(false);
    inputRef.current?.focus();
  }, [phase, idx, current]);

  /** 收卷：答对的记成已学会 */
  const finish = useCallback(() => {
    clearAutoTimer();
    const right = resultsRef.current.filter(r => r.correct);
    right.forEach(r => setStatus(r.item, 'mastered'));
    setMarked(right.length);
    setResults(resultsRef.current);
    setPhase('result');
    onFinish?.(right.length);
  }, [setStatus, onFinish]);

  const goNext = useCallback(() => {
    clearAutoTimer();
    if (idx + 1 >= pool.length) {
      finish();
      return;
    }
    setIdx(i => i + 1);
  }, [idx, pool.length, finish]);

  const submit = useCallback(() => {
    if (submitted || !current) return;
    const correct = normalize(input) === normalize(current.en);
    const rec: AnswerRecord = { item: current, correct, userAnswer: input };
    resultsRef.current = [...resultsRef.current, rec];
    setResults(resultsRef.current);
    setSubmitted(true);
    // 亮出答案的同时把英文念一遍，耳朵跟上刚写出来的东西
    speak({ text: current.en, lang: 'en-US' });
    // 答对了不用再按一次，看完绿勾自己往下走；
    // 答错必须停住 —— 得让人看清正确答案，不能一闪而过
    if (correct) {
      autoTimerRef.current = window.setTimeout(() => {
        autoTimerRef.current = null;
        goNext();
      }, AUTO_NEXT_MS);
    }
  }, [submitted, current, input, goNext]);

  // Enter 通吃：不管焦点在不在输入框里都管用。
  // 之前挂在输入框的 onKeyDown 上，判完答案输入框就被 disabled、焦点也没了，
  // 于是第二次按 Enter 完全没反应，只能去点按钮。
  useEffect(() => {
    if (phase !== 'quiz') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (submitted) goNext();
      else submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, submitted, goNext, submit]);

  const isRight =
    phase === 'quiz' && !!current && submitted && normalize(input) === normalize(current.en);

  const wrong = results.filter(r => !r.correct);
  const correctCount = results.filter(r => r.correct).length;

  if (!open) return null;

  const panel: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  };
  const card: React.CSSProperties = {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90vh',
    overflow: 'auto',
    background: '#fff',
    borderRadius: 14,
    padding: 24,
    boxShadow: '0 12px 40px rgba(0,0,0,.22)',
  };
  const btn: React.CSSProperties = {
    border: '1px solid #d9d9d9',
    background: '#fff',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 14,
    cursor: 'pointer',
  };
  const primary: React.CSSProperties = {
    ...btn,
    background: '#1677ff',
    borderColor: '#1677ff',
    color: '#fff',
    fontWeight: 500,
  };

  return (
    <div style={panel} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        {/* ── 开场：选范围 ── */}
        {phase === 'intro' && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 19 }}>{scopeName}</h2>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 18 }}>
              {fmt('englishShorts.quizIntro', {
                scope: scopeName,
                n: items.length,
                m: unlearned.length,
              })}
            </div>

            {items.length === 0 ? (
              <div style={{ color: '#999' }}>{t('englishShorts.quizEmpty')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => start(false)} style={primary}>
                  {fmt('englishShorts.quizStartAll', { n: items.length })}
                </button>
                <button
                  onClick={() => start(true)}
                  style={btn}
                  disabled={unlearned.length === 0}
                >
                  {fmt('englishShorts.quizStartUnlearned', { m: unlearned.length })}
                </button>
              </div>
            )}

            <div style={{ marginTop: 18, textAlign: 'right' }}>
              <button onClick={onClose} style={btn}>
                {t('englishShorts.quizClose')}
              </button>
            </div>
          </>
        )}

        {/* ── 答题 ── */}
        {phase === 'quiz' && current && (
          <>
            <div style={{ color: '#999', fontSize: 13, marginBottom: 4 }}>
              {fmt('englishShorts.quizProgress', { i: idx + 1, n: pool.length })}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.4 }}>
                {current.name}
              </div>
              <button
                onClick={() =>
                  speak({
                    text: current.name,
                    lang: 'zh-CN',
                    onError: () => setSpeechFailed(true),
                  })
                }
                style={{ ...btn, marginTop: 10, padding: '5px 12px', fontSize: 13 }}
              >
                🔊 {t('englishShorts.quizReplay')}
              </button>
              {/* 静默失败最难查：不出声也不报错。这里由 speak() 的看门狗兜底，
                  真的没开口就把提示摆出来，不用去翻控制台 */}
              {speechFailed && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    background: '#fff2f0',
                    border: '1px solid #ffccc7',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#cf1322',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>⚠️ {t('englishShorts.quizNoSound')}</span>
                  <a
                    href="/tts-check.html"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#0958d9', textDecoration: 'underline' }}
                  >
                    {t('englishShorts.quizCheckAudio')} →
                  </a>
                </div>
              )}
            </div>

            <div style={{ color: '#aaa', fontSize: 12, marginBottom: 6 }}>
              {t('englishShorts.quizHint')}
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              // 判完答案不能 disabled —— 那样焦点就没了、键盘事件也接不到。
              // 改成只读，焦点留在框里，Enter 交给上面的全局监听。
              readOnly={submitted}
              placeholder={t('englishShorts.quizPlaceholder')}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontSize: 17,
                padding: '10px 12px',
                borderRadius: 8,
                border: submitted
                  ? isRight
                    ? '2px solid #52c41a'
                    : '2px solid #ff4d4f'
                  : '1px solid #d9d9d9',
                outline: 'none',
                background: submitted ? (isRight ? '#f6ffed' : '#fff2f0') : '#fff',
              }}
            />

            {submitted && (
              <div style={{ marginTop: 12, fontSize: 15 }}>
                {isRight ? (
                  <div style={{ color: '#389e0d', fontWeight: 600 }}>
                    ✅ {t('englishShorts.quizCorrect')}
                  </div>
                ) : (
                  <div>
                    <div style={{ color: '#cf1322', fontWeight: 600 }}>
                      ❌ {t('englishShorts.quizWrong')}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 17, fontWeight: 600 }}>
                      {current.en}
                    </div>
                    <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                      你写的：{input || '（空）'}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                marginTop: 18,
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              {submitted && isRight && idx + 1 < pool.length && (
                <span style={{ color: '#aaa', fontSize: 12 }}>马上进下一题…</span>
              )}
              {submitted && !isRight && (
                <span style={{ color: '#aaa', fontSize: 12 }}>按 Enter 继续</span>
              )}
              {submitted ? (
                <button onClick={goNext} style={primary}>
                  {idx + 1 >= pool.length
                    ? t('englishShorts.quizFinish')
                    : t('englishShorts.quizNext')}
                </button>
              ) : (
                <button onClick={submit} style={primary} disabled={!input.trim()}>
                  {t('englishShorts.quizSubmit')}
                </button>
              )}
            </div>
          </>
        )}

        {/* ── 结果 ── */}
        {phase === 'result' && (
          <>
            <h2 style={{ margin: '0 0 10px', fontSize: 19 }}>
              {fmt('englishShorts.quizScore', { n: correctCount, total: results.length })}
            </h2>

            {marked > 0 && (
              <div
                style={{
                  padding: '8px 12px',
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: 8,
                  color: '#389e0d',
                  fontSize: 14,
                  marginBottom: 12,
                }}
              >
                {fmt('englishShorts.quizMarked', { n: marked })}
              </div>
            )}

            {wrong.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  {t('englishShorts.quizReviewWrong')}
                </div>
                {wrong.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '6px 0',
                      borderBottom: '1px solid #f0f0f0',
                      fontSize: 14,
                    }}
                  >
                    <span>{r.item.name}</span>
                    <span style={{ fontWeight: 600 }}>{r.item.en}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  clearAutoTimer();
                  resultsRef.current = [];
                  setPool(shuffle(items).slice(0, Math.min(QUIZ_SIZE, items.length)));
                  setIdx(0);
                  setInput('');
                  setSubmitted(false);
                  setResults([]);
                  setPhase('quiz');
                }}
                style={btn}
              >
                {t('englishShorts.quizAgain')}
              </button>
              <button onClick={onClose} style={primary}>
                {t('englishShorts.quizClose')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShortQuizModal;
