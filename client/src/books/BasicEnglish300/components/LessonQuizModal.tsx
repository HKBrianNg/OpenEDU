// client/src/books/BasicEnglish300/components/LessonQuizModal.tsx
//
// 句子测验三卷弹窗：
//   第 1 轮：听英文选中文（纯听力，不显示文字，自动播英文 mp3）
//   第 2 轮：看中文选英文（阅读理解，自动播中文 mp3）
//   第 3 轮：看中文写全句（拼写，自动播英文 mp3）
//
// 中英文朗读：优先播 mp3，失败降级 TTS

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LessonItem } from '../types'
import type { WordStatus } from '../../EnglishWord/progressStorage'
import { useLocale } from '../../../store/LocaleContext'
import { applyVoiceSettings } from '../../../utils/speech'

interface LessonQuizModalProps {
  lessons: LessonItem[]
  getLessonStatus: (item: LessonItem) => WordStatus
  setLessonStatus: (item: LessonItem, status: WordStatus) => void
  chapter?: { en?: string; name?: string }
  chapterIndex?: number
  open: boolean
  onClose: () => void
}

type QuizPhase = 'intro' | 'listening' | 'reading' | 'writing' | 'result'
interface AnswerRecord {
  lesson: LessonItem
  correct: boolean
  userAnswer: string
}

const QUIZ_SIZE = 5
const MIN_TO_START = 5
const PASS_SCORE = 90

const pointsFor = (n: number) => {
  const total = Math.max(1, n)
  return { listening: 20 / total, reading: 40 / total, writing: 40 / total }
}

function normalizeSentence(s: string): string {
  return s
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function enToAudioName(en: string): string {
  if (!en) return ''
  return en
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 中文选项（第 1 轮用：干扰项是其他句子的中文） */
function pickChineseOptions(pool: LessonItem[], correct: LessonItem, count = 4): LessonItem[] {
  const others = pool.filter(l => (l.name ?? '') !== (correct.name ?? ''))
  const wrong = shuffle(others).slice(0, count - 1)
  return shuffle([correct, ...wrong])
}

/** 英文选项（第 2 轮用：干扰项是其他句子的英文） */
function pickEnglishOptions(pool: LessonItem[], correct: LessonItem, count = 4): LessonItem[] {
  const others = pool.filter(l => (l.en ?? '') !== (correct.en ?? ''))
  const wrong = shuffle(others).slice(0, count - 1)
  return shuffle([correct, ...wrong])
}

function useSpeechWithId() {
  const ref = useRef<SpeechSynthesisUtterance | null>(null)
  const timerRef = useRef<number | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const speakingIdRef = useRef<string | null>(null)

  const finish = useCallback((id: string) => {
    if (speakingIdRef.current !== id) return
    speakingIdRef.current = null
    ref.current = null
    setSpeakingId(null)
  }, [])

  const speak = useCallback(
    (text: string, lang: 'en-US' | 'zh-CN', id: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return
      const synth = window.speechSynthesis

      if (speakingIdRef.current === id) {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
        synth.cancel()
        speakingIdRef.current = null
        setSpeakingId(null)
        ref.current = null
        return
      }

      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      synth.cancel()

      const utt = new SpeechSynthesisUtterance(text)
      applyVoiceSettings(utt, lang)
      utt.onend = () => finish(id)
      utt.onerror = () => finish(id)

      ref.current = utt
      speakingIdRef.current = id
      setSpeakingId(id)

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        synth.speak(utt)
      }, 60)
    },
    [finish],
  )

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    window.speechSynthesis.cancel()
    speakingIdRef.current = null
    ref.current = null
    setSpeakingId(null)
  }, [])

  return { speak, stop, speakingId }
}

export default function LessonQuizModal({
  lessons,
  getLessonStatus,
  setLessonStatus,
  chapter,
  chapterIndex,
  open,
  onClose,
}: LessonQuizModalProps) {
  const { t } = useLocale()
  const { speak, stop, speakingId } = useSpeechWithId()

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null)
  const autoSpokenRef = useRef<string | null>(null)

  const pool = useMemo(() => lessons.filter(l => getLessonStatus(l) === 'learning'), [lessons, getLessonStatus])

  const [phase, setPhase] = useState<QuizPhase>('intro')
  const [quizLessons, setQuizLessons] = useState<LessonItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [listeningAnswers, setListeningAnswers] = useState<AnswerRecord[]>([])
  const [readingAnswers, setReadingAnswers] = useState<AnswerRecord[]>([])
  const [writingAnswers, setWritingAnswers] = useState<AnswerRecord[]>([])
  const [submitted, setSubmitted] = useState(false)
  const writingInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      const picked = shuffle(pool).slice(0, Math.min(QUIZ_SIZE, pool.length))
      setQuizLessons(picked)
      setPhase('intro')
      setCurrentIndex(0)
      setListeningAnswers([])
      setReadingAnswers([])
      setWritingAnswers([])
      setSubmitted(false)
      autoSpokenRef.current = null
      stop()
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setAudioPlayingId(null) }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, pool, stop])

  const current = quizLessons[currentIndex]

  const tryPlayAudio = useCallback((
    enText: string,
    lang: 'en' | 'zh',
    id: string,
    onEnd?: () => void,
  ): void => {
    const targetText = lang === 'zh' ? (current?.name ?? '') : (enText ?? '')
    if (!enText) {
      if (targetText) speak(targetText, lang === 'zh' ? 'zh-CN' : 'en-US', id)
      return
    }

    const name = enToAudioName(enText)
    if (!name) {
      if (targetText) speak(targetText, lang === 'zh' ? 'zh-CN' : 'en-US', id)
      return
    }

    const chapterNum = chapterIndex ?? 1
    const cleanEn = chapter?.en?.toLowerCase()
      .replace(/[:\s\/\\]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/, '') || ''

    const suffix = lang === 'zh' ? 'zh' : 'en'
    const base = '/data/BasicEnglish300'

    const dirs: string[] = [
      `chapter-${chapterNum}`,
      cleanEn ? `chapter-${chapterNum}-${cleanEn}` : null,
      cleanEn,
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) as string[]

    let settled = false
    const finishAudio = () => { settled = true; audioRef.current = null; setAudioPlayingId(null) }

    const playUrl = (url: string) => {
      stop()
      const audio = new Audio(url)
      audio.preload = 'auto'
      audioRef.current = audio
      setAudioPlayingId(id)

      audio.onended = () => { finishAudio(); onEnd?.() }
      audio.onerror = () => {
        if (settled) return
        attemptNext()
      }

      audio.play().catch(() => {
        if (settled) return
        attemptNext()
      })
    }

    const attemptNext = (idx = 0) => {
      if (settled) return
      if (idx >= dirs.length) {
        finishAudio()
        if (targetText) speak(targetText, lang === 'zh' ? 'zh-CN' : 'en-US', id)
        return
      }
      const url = `${base}/content/audio/${dirs[idx]}/${name}_${suffix}.mp3`
      fetch(url, { method: 'HEAD' })
        .then(res => {
          if (settled) return
          if (res.ok) playUrl(url)
          else attemptNext(idx + 1)
        })
        .catch(() => {
          if (!settled) attemptNext(idx + 1)
        })
    }

    attemptNext()
  }, [chapter, chapterIndex, current?.name, speak, stop])

  // ────────────────────────────────────────────────────────
  // 自动播放
  // 第 1 轮（listening）：播英文 mp3（不显示文字，纯听力）
  // 第 2 轮（reading）：  播中文 mp3（显示中文，选英文）
  // 第 3 轮（writing）：  播英文 mp3（显示中文，拼英文）
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !current) return

    const payload =
      phase === 'listening' ? { lang: 'en' as const, id: `lesson-quiz-listen-${current.en}` }
      : phase === 'reading'   ? { lang: 'zh' as const, id: `lesson-quiz-read-${current.en}` }
      : phase === 'writing'   ? { lang: 'en' as const, id: `lesson-quiz-write-${current.en}` }
      : null
    if (!payload) return

    const key = `${phase}:${currentIndex}:${current.en}`
    if (autoSpokenRef.current === key) return
    autoSpokenRef.current = key

    tryPlayAudio(current.en ?? '', payload.lang, payload.id)
  }, [phase, currentIndex, current, open, tryPlayAudio])

  useEffect(() => {
    if (phase === 'writing') writingInputRef.current?.focus()
  }, [phase, currentIndex])

  // 第 1 轮：中文选项
  const listeningOptions = useMemo(() => {
    if (phase !== 'listening' || !current) return []
    return pickChineseOptions(lessons, current)
  }, [phase, current, lessons])

  // 第 2 轮：英文选项
  const readingOptions = useMemo(() => {
    if (phase !== 'reading' || !current) return []
    return pickEnglishOptions(lessons, current)
  }, [phase, current, lessons])

  const score = useMemo(() => {
    if (!submitted) return 0
    const p = pointsFor(quizLessons.length)
    return Math.round(
      listeningAnswers.filter(a => a.correct).length * p.listening +
      readingAnswers.filter(a => a.correct).length * p.reading +
      writingAnswers.filter(a => a.correct).length * p.writing,
    )
  }, [submitted, listeningAnswers, readingAnswers, writingAnswers, quizLessons.length])

  const fullyCorrect = useMemo(() => {
    if (!submitted) return new Set<string>()
    const l = new Set(listeningAnswers.filter(a => a.correct).map(a => a.lesson.en))
    const r = new Set(readingAnswers.filter(a => a.correct).map(a => a.lesson.en))
    const w = new Set(writingAnswers.filter(a => a.correct).map(a => a.lesson.en))
    return new Set([...l].filter(x => r.has(x) && w.has(x)))
  }, [submitted, listeningAnswers, readingAnswers, writingAnswers])

  const isPassed = score >= PASS_SCORE

  // 第 1 轮：点中文选项
  function handleListeningChoice(picked: LessonItem) {
    if (submitted || !current) return
    const correct = (picked.name ?? '') === (current.name ?? '')
    const rec: AnswerRecord = { lesson: current, correct, userAnswer: picked.name ?? '' }
    setListeningAnswers(prev => { const next = prev.slice(); next[currentIndex] = rec; return next })
    if (currentIndex < quizLessons.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setPhase('reading'); setCurrentIndex(0)
    }
  }

  // 第 2 轮：点英文选项
  function handleReadingChoice(picked: LessonItem) {
    if (submitted || !current) return
    const correct = (picked.en ?? '') === (current.en ?? '')
    const rec: AnswerRecord = { lesson: current, correct, userAnswer: picked.en ?? '' }
    setReadingAnswers(prev => { const next = prev.slice(); next[currentIndex] = rec; return next })
    if (currentIndex < quizLessons.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setPhase('writing'); setCurrentIndex(0)
    }
  }

  function handleWriting(answer: string) {
    if (submitted || !current) return
    const trimmed = answer.trim()
    if (!trimmed) return
    const correct = normalizeSentence(trimmed) === normalizeSentence(current.en ?? '')
    const rec: AnswerRecord = { lesson: current, correct, userAnswer: trimmed }
    setWritingAnswers(prev => { const next = prev.slice(); next[currentIndex] = rec; return next })
    if (currentIndex < quizLessons.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setSubmitted(true); setPhase('result')
    }
  }

  function handleUpload() {
    fullyCorrect.forEach(en => {
      const lesson = quizLessons.find(l => l.en === en)
      if (lesson) setLessonStatus(lesson, 'mastered')
    })
    onClose()
  }

  const isPlaying = useCallback((id: string) => {
    return audioPlayingId === id || speakingId === id
  }, [audioPlayingId, speakingId])

  if (!open) return null

  if (lessons.length > 0 && pool.length < MIN_TO_START) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 15, color: '#666' }}>
            {t('basicenglish300.quizEmpty') || '学习中的句子不足，无法开始测验'}
            {`（当前 ${pool.length} / 需要 ${MIN_TO_START} 句）`}
          </p>
          <button onClick={onClose} style={{ marginTop: 14, padding: '8px 28px', fontSize: 14, borderRadius: 99, border: '1px solid #d0d0d0', background: '#fff', cursor: 'pointer' }}>
            {t('basicenglish300.close') || '关闭'}
          </button>
        </div>
      </div>
    )
  }

  const renderIntro = () => (
    <div style={{ textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 660 }}>
        {t('basicenglish300.quizTitle') || '句子测验'}
      </h3>
      <p style={{ fontSize: 15, color: '#555', marginBottom: 8 }}>
        {t('basicenglish300.quizIntro') || '本次测验共 3 卷，满分 100 分'}
        {`（共 ${quizLessons.length * 3} 题）`}
      </p>
      <p style={{ fontSize: 13, color: '#777', marginBottom: 20 }}>
        {`① ${t('basicenglish300.quizListening') || '听英文选中文'}（每题${pointsFor(quizLessons.length).listening}分） → `}
        {`② ${t('basicenglish300.quizReading') || '看中文选英文'}（每题${pointsFor(quizLessons.length).reading}分） → `}
        {`③ ${t('basicenglish300.quizWriting') || '看中文写全句'}（每题${pointsFor(quizLessons.length).writing}分）`}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button
          onClick={() => { setPhase('listening'); setCurrentIndex(0) }}
          style={{ padding: '12px 38px', fontSize: 15, borderRadius: 99, border: 'none', background: '#1976d2', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
        >
          {t('basicenglish300.quizStart') || '开始测验'}
        </button>
        <button onClick={onClose} style={{ padding: '12px 28px', fontSize: 15, borderRadius: 99, border: '1px solid #d0d0d0', background: '#fff', color: '#333', cursor: 'pointer' }}>
          {t('basicenglish300.quizExit') || '退出'}
        </button>
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────
  // 第 1 轮：听英文选中文
  // ★ 不显示任何文字，只给播放按钮 + 4 个中文选项
  // ────────────────────────────────────────────────────────
  const renderListening = () => {
    if (!current) return null
    const id = `lesson-quiz-listen-${current.en}`
    const playing = isPlaying(id)
    return (
      <div>
        <p style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 12 }}>
          {t('basicenglish300.quizListening') || '听英文选中文'} ({currentIndex + 1}/{quizLessons.length})
        </p>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <button
            onClick={() => {
              if (playing) stop()
              else tryPlayAudio(current.en ?? '', 'en', id)
            }}
            style={{ padding: '16px 36px', fontSize: 18, borderRadius: 99, border: '2px solid #1976d2', background: playing ? '#e3f2fd' : '#fff', color: '#1976d2', cursor: 'pointer', fontWeight: 600 }}
          >
            {playing ? '🔊 播放中…（再按停止）' : '🔊 点击播放英文发音'}
          </button>
          <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
            听发音，从下面选出正确的中文意思
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {listeningOptions.map(opt => (
            <button key={opt.en ?? opt.name} onClick={() => handleListeningChoice(opt)} style={{ padding: '16px 18px', fontSize: 16, borderRadius: 12, border: '1px solid #d0d0d0', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
              {opt.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────
  // 第 2 轮：看中文选英文
  // 显示中文 + 自动播中文 mp3 + 4 个英文选项
  // ────────────────────────────────────────────────────────
  const renderReading = () => {
    if (!current) return null
    const id = `lesson-quiz-read-${current.en}`
    const playing = isPlaying(id)
    return (
      <div>
        <p style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 12 }}>
          {t('basicenglish300.quizReading') || '看中文选英文'} ({currentIndex + 1}/{quizLessons.length})
        </p>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 12, color: '#222' }}>
            {current.name}
          </div>
          <button
            onClick={() => {
              if (playing) stop()
              else tryPlayAudio(current.en ?? '', 'zh', id)
            }}
            style={{ padding: '10px 24px', fontSize: 14, borderRadius: 99, border: '1px solid #d0d0d0', background: playing ? '#e3f2fd' : '#fff', color: '#1976d2', cursor: 'pointer' }}
          >
            {playing ? '🔊 播放中…' : '🔊 听中文发音'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {readingOptions.map(opt => (
            <button key={opt.en} onClick={() => handleReadingChoice(opt)} style={{ padding: '14px 18px', fontSize: 16, borderRadius: 12, border: '1px solid #d0d0d0', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
              {opt.en}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────
  // 第 3 轮：看中文写全句（拼写）
  // ────────────────────────────────────────────────────────
  const renderWriting = () => {
    if (!current) return null
    const id = `lesson-quiz-write-${current.en}`
    const playing = isPlaying(id)
    return (
      <div>
        <p style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 12 }}>
          {t('basicenglish300.quizWriting') || '看中文写全句'} ({currentIndex + 1}/{quizLessons.length})
        </p>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 600, color: '#222', padding: '0 16px', lineHeight: 1.6 }}>
            {current.name}
          </div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
            {t('basicenglish300.quizWritingPrompt') || '请把上面的中文翻译成英文整句'}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <button
            onClick={() => {
              if (playing) stop()
              else tryPlayAudio(current.en ?? '', 'en', id)
            }}
            style={{ padding: '9px 22px', fontSize: 13, borderRadius: 99, border: '1px solid #d0d0d0', background: playing ? '#e3f2fd' : '#fff', color: '#1976d2', cursor: 'pointer' }}
          >
            {playing ? '🔊 播放中…' : '🔊 听整句'}
          </button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <input
            ref={writingInputRef}
            type="text"
            defaultValue=""
            key={current.en}
            placeholder={t('basicenglish300.quizWritingPlaceholder') || '输入完整的英文句子'}
            style={{ padding: '10px 16px', fontSize: 16, borderRadius: 12, border: '2px solid #1976d2', width: '80%', textAlign: 'center', outline: 'none' }}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleWriting((e.target as HTMLInputElement).value) }
            }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
            {t('basicenglish300.quizWritingHint') || '按 Enter 提交并进入下一题'}
          </div>
        </div>
      </div>
    )
  }

  const renderResult = () => {
    const total = quizLessons.length * 3
    const correct =
      listeningAnswers.filter(a => a.correct).length +
      readingAnswers.filter(a => a.correct).length +
      writingAnswers.filter(a => a.correct).length
    return (
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 660, textAlign: 'center' }}>
          {t('basicenglish300.quizResult') || '测验结果'}
        </h3>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: isPassed ? '#2e7d32' : '#c62828' }}>
            {score} / 100
          </div>
          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            {t('basicenglish300.quizCorrectCount') || '答对'} {correct} / {total} {t('basicenglish300.quizQuestions') || '题'}
          </div>
        </div>
        {[
          { name: t('basicenglish300.quizListening') || '听英文选中文', arr: listeningAnswers },
          { name: t('basicenglish300.quizReading') || '看中文选英文', arr: readingAnswers },
          { name: t('basicenglish300.quizWriting') || '看中文写全句', arr: writingAnswers },
        ].map((sec, si) => (
          <div key={si} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{sec.name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sec.arr.map((a, i) => (
                <span key={i} style={{ width: 28, height: 28, borderRadius: 50, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, background: a.correct ? '#e8f5e9' : '#fce4ec', color: a.correct ? '#2e7d32' : '#c62828', border: `1px solid ${a.correct ? '#a5d6a7' : '#f5c6cb'}` }}>
                  {a.correct ? '✓' : '✗'}
                </span>
              ))}
            </div>
          </div>
        ))}
        {isPassed && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <button onClick={handleUpload} style={{ padding: '12px 38px', fontSize: 15, borderRadius: 99, border: 'none', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              {t('basicenglish300.quizUpload') || '上传结果'} ({fullyCorrect.size} {t('basicenglish300.quizLessons') || '句'})
            </button>
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <button onClick={onClose} style={{ padding: '10px 28px', fontSize: 14, borderRadius: 99, border: '1px solid #d0d0d0', background: '#fff', color: '#333', cursor: 'pointer' }}>
            {t('basicenglish300.quizClose') || '关闭'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 'min(560px, 92vw)', maxHeight: '85vh', overflowY: 'auto', padding: '24px 22px 20px', boxShadow: '0 10px 32px rgba(0,0,0,0.19)' }}>
        {phase === 'intro' && renderIntro()}
        {phase === 'listening' && renderListening()}
        {phase === 'reading' && renderReading()}
        {phase === 'writing' && renderWriting()}
        {phase === 'result' && renderResult()}
      </div>
    </div>
  )
}