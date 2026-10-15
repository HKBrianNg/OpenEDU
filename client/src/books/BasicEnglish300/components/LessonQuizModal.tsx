// client/src/books/BasicEnglish300/components/LessonQuizModal.tsx
//
// 句子测验三卷弹窗：
//   - 听音选句：朗读英文句子，从 4 个英文选项中选正确的
//   - 认句选义：显示中文，从 4 个英文选项中选对应的英文
//   - 拼写首词：句子首词挖空，用户输入首词
//
// 题源：当前章节里 learning 状态的句子；不足时弹空提示
// 通过：3 卷总分 >= 90 分

import { useEffect, useMemo, useRef, useState } from 'react'
import type { LessonItem } from '../types'
import type { WordStatus } from '../../EnglishWord/progressStorage'
import { useLocale } from '../../../store/LocaleContext'

interface LessonQuizModalProps {
  lessons: LessonItem[]
  getLessonStatus: (item: LessonItem) => WordStatus
  setLessonStatus: (item: LessonItem, status: WordStatus) => void
  open: boolean
  onClose: () => void
}

type QuizPhase = 'intro' | 'listening' | 'recognition' | 'writing' | 'result'
interface AnswerRecord {
  lesson: LessonItem
  correct: boolean
  userAnswer: string
}

const POINTS = { listening: 2, recognition: 4, writing: 4 } as const
const PASS_SCORE = 90

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickOptions(pool: LessonItem[], correct: LessonItem, count = 4): LessonItem[] {
  const others = pool.filter(l => l.en !== correct.en)
  const wrong = shuffle(others).slice(0, count - 1)
  return shuffle([correct, ...wrong])
}

function useSpeechWithId() {
  const ref = useRef<SpeechSynthesisUtterance | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  function speak(text: string, lang: 'en-US' | 'zh-CN', id: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (speakingId === id) {
      // 同一题再点 → 停止
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      ref.current = null
      return
    }
    window.speechSynthesis.cancel()
    setTimeout(() => {
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = lang
      utt.rate = 0.88
      ref.current = utt
      setSpeakingId(id)
      utt.onend = () => {
        setSpeakingId(prev => (prev === id ? null : prev))
        ref.current = null
      }
      utt.onerror = () => {
        setSpeakingId(prev => (prev === id ? null : prev))
        ref.current = null
      }
      window.speechSynthesis.speak(utt)
    }, 50)
  }

  return { speak, speakingId, ref }
}

export default function LessonQuizModal({
  lessons,
  getLessonStatus,
  setLessonStatus,
  open,
  onClose,
}: LessonQuizModalProps) {
  const { t } = useLocale()
  const { speak, speakingId } = useSpeechWithId()

  // 题目池：learning 状态的句子
  const pool = useMemo(() => lessons.filter(l => getLessonStatus(l) === 'learning'), [lessons, getLessonStatus])

  const [phase, setPhase] = useState<QuizPhase>('intro')
  const [quizLessons, setQuizLessons] = useState<LessonItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [listeningAnswers, setListeningAnswers] = useState<AnswerRecord[]>([])
  const [recognitionAnswers, setRecognitionAnswers] = useState<AnswerRecord[]>([])
  const [writingAnswers, setWritingAnswers] = useState<AnswerRecord[]>([])
  const [submitted, setSubmitted] = useState(false)
  const writingInputRef = useRef<HTMLInputElement>(null)

  // 打开时初始化题库
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 弹窗从关→开 是一次性的状态机入口：open prop 是外部状态，effect 用来把内部状态机重置到「介绍页」 */
    if (open) {
      const picked = shuffle(pool).slice(0, Math.min(10, pool.length))
      setQuizLessons(picked)
      setPhase('intro')
      setCurrentIndex(0)
      setListeningAnswers([])
      setRecognitionAnswers([])
      setWritingAnswers([])
      setSubmitted(false)
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, pool])

  const current = quizLessons[currentIndex]

  // 各阶段自动发声
  useEffect(() => {
    if (!open || !current) return
    if (phase === 'listening' && current.en) {
      speak(current.en, 'en-US', `lesson-quiz-listen-${current.en}`)
    } else if (phase === 'recognition' && current.name) {
      speak(current.name, 'zh-CN', `lesson-quiz-recognize-${current.en}`)
    } else if (phase === 'writing' && current.en) {
      speak(current.en, 'en-US', `lesson-quiz-write-${current.en}`)
    }
  }, [phase, currentIndex, current, open, speak])

  // 拼写阶段自动 focus 输入框
  useEffect(() => {
    if (phase === 'writing') writingInputRef.current?.focus()
  }, [phase, currentIndex])

  // 各阶段的选项池：包含正确答案 + 3 个随机干扰项
  const listeningOptions = useMemo(() => {
    if (phase !== 'listening' || !current) return []
    return pickOptions(lessons, current)
  }, [phase, current, lessons])

  const recognitionOptions = useMemo(() => {
    if (phase !== 'recognition' || !current) return []
    return pickOptions(lessons, current)
  }, [phase, current, lessons])

  // 写卷：把首词挖空
  const writingDisplay = useMemo(() => {
    if (phase !== 'writing' || !current) return { masked: '', answer: '' }
    const m = current.en.match(/^(\S+)/)
    const first = m?.[0] ?? ''
    if (!first) return { masked: current.en, answer: '' }
    const mask = first.replace(/\S/g, '_')
    return { masked: current.en.replace(first, mask), answer: first }
  }, [phase, current])

  // 计分
  const score = useMemo(() => {
    if (!submitted) return 0
    return (
      listeningAnswers.filter(a => a.correct).length * POINTS.listening +
      recognitionAnswers.filter(a => a.correct).length * POINTS.recognition +
      writingAnswers.filter(a => a.correct).length * POINTS.writing
    )
  }, [submitted, listeningAnswers, recognitionAnswers, writingAnswers])

  // 三卷全对的句子
  const fullyCorrect = useMemo(() => {
    if (!submitted) return new Set<string>()
    const l = new Set(listeningAnswers.filter(a => a.correct).map(a => a.lesson.en))
    const r = new Set(recognitionAnswers.filter(a => a.correct).map(a => a.lesson.en))
    const w = new Set(writingAnswers.filter(a => a.correct).map(a => a.lesson.en))
    return new Set([...l].filter(x => r.has(x) && w.has(x)))
  }, [submitted, listeningAnswers, recognitionAnswers, writingAnswers])

  const isPassed = score >= PASS_SCORE

  function handleChoice(phaseType: 'listening' | 'recognition', picked: LessonItem) {
    if (submitted || !current) return
    const correct = picked.en === current.en
    const rec: AnswerRecord = { lesson: current, correct, userAnswer: picked.en }
    const setter = phaseType === 'listening' ? setListeningAnswers : setRecognitionAnswers
    setter(prev => {
      const next = prev.slice()
      next[currentIndex] = rec
      return next
    })
    if (currentIndex < quizLessons.length - 1) {
      setCurrentIndex(i => i + 1)
    } else if (phaseType === 'listening') {
      setPhase('recognition')
      setCurrentIndex(0)
    } else {
      setPhase('writing')
      setCurrentIndex(0)
    }
  }

  function handleWriting(answer: string) {
    if (submitted || !current) return
    const trimmed = answer.trim()
    if (!trimmed) return
    const correct = trimmed.toLowerCase() === writingDisplay.answer.toLowerCase().replace(/[.,!?]/g, '')
    const rec: AnswerRecord = { lesson: current, correct, userAnswer: trimmed }
    setWritingAnswers(prev => {
      const next = prev.slice()
      next[currentIndex] = rec
      return next
    })
    if (currentIndex < quizLessons.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setSubmitted(true)
      setPhase('result')
    }
  }

  function handleUpload() {
    fullyCorrect.forEach(en => {
      const lesson = quizLessons.find(l => l.en === en)
      if (lesson) setLessonStatus(lesson, 'mastered')
    })
    onClose()
  }

  if (!open) return null

  // 池为空
  if (lessons.length > 0 && pool.length < 1) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 15, color: '#666' }}>
            {t('basicenglish300.quizEmpty') || '学习中的句子不足，无法开始测验'}
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
        {t('basicenglish300.quizIntro') || `本次测验共 3 卷，${quizLessons.length * 2 + quizLessons.length * 4 * 2} 题，满分 100 分`}
      </p>
      <p style={{ fontSize: 13, color: '#777', marginBottom: 20 }}>
        {t('basicenglish300.quizIntroDetail') || '第1卷：听音选句（每题2分）→ 第2卷：认句选义（每题4分）→ 第3卷：拼写首词（每题4分）'}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button
          onClick={() => { setPhase('listening'); setCurrentIndex(0) }}
          style={{ padding: '12px 38px', fontSize: 15, borderRadius: 99, border: 'none', background: '#1976d2', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
        >
          {t('basicenglish300.quizStart') || '开始测验'}
        </button>
        <button
          onClick={onClose}
          style={{ padding: '12px 28px', fontSize: 15, borderRadius: 99, border: '1px solid #d0d0d0', background: '#fff', color: '#333', cursor: 'pointer' }}
        >
          {t('basicenglish300.quizExit') || '退出'}
        </button>
      </div>
    </div>
  )

  const renderListening = () => {
    if (!current) return null
    const id = `lesson-quiz-listen-${current.en}`
    const isSpeaking = speakingId === id
    return (
      <div>
        <p style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 12 }}>
          {t('basicenglish300.quizListening') || '听音选句'} ({currentIndex + 1}/{quizLessons.length})
        </p>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button
            onClick={() => current.en && speak(current.en, 'en-US', id)}
            style={{
              padding: '12px 28px', fontSize: 16, borderRadius: 99,
              border: '1px solid #d0d0d0',
              background: isSpeaking ? '#e3f2fd' : '#fff',
              color: '#1976d2', cursor: 'pointer', fontWeight: 600,
            }}
          >
            {isSpeaking ? '🔊 播放中…' : '🔊 播放句子'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {listeningOptions.map(opt => (
            <button
              key={opt.en}
              onClick={() => handleChoice('listening', opt)}
              style={{
                padding: '14px 18px', fontSize: 16, borderRadius: 12,
                border: '1px solid #d0d0d0', background: '#fff',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >
              {opt.en}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderRecognition = () => {
    if (!current) return null
    const id = `lesson-quiz-recognize-${current.en}`
    const isSpeaking = speakingId === id
    return (
      <div>
        <p style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 12 }}>
          {t('basicenglish300.quizRecognition') || '认句选义'} ({currentIndex + 1}/{quizLessons.length})
        </p>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 12, color: '#222' }}>
            {current.name}
          </div>
          <button
            onClick={() => current.name && speak(current.name, 'zh-CN', id)}
            style={{
              padding: '10px 24px', fontSize: 14, borderRadius: 99,
              border: '1px solid #d0d0d0',
              background: isSpeaking ? '#e3f2fd' : '#fff',
              color: '#1976d2', cursor: 'pointer',
            }}
          >
            {isSpeaking ? '🔊 播放中…' : '🔊 听中文'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {recognitionOptions.map(opt => (
            <button
              key={opt.en}
              onClick={() => handleChoice('recognition', opt)}
              style={{
                padding: '14px 18px', fontSize: 16, borderRadius: 12,
                border: '1px solid #d0d0d0', background: '#fff',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >
              {opt.en}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderWriting = () => {
    if (!current) return null
    const id = `lesson-quiz-write-${current.en}`
    const isSpeaking = speakingId === id
    return (
      <div>
        <p style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 12 }}>
          {t('basicenglish300.quizWriting') || '拼写首词'} ({currentIndex + 1}/{quizLessons.length})
        </p>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 22, fontStyle: 'italic', color: '#222', padding: '0 16px', lineHeight: 1.6 }}>
            {writingDisplay.masked}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <button
            onClick={() => current.en && speak(current.en, 'en-US', id)}
            style={{
              padding: '9px 22px', fontSize: 13, borderRadius: 99,
              border: '1px solid #d0d0d0',
              background: isSpeaking ? '#e3f2fd' : '#fff',
              color: '#1976d2', cursor: 'pointer',
            }}
          >
            {isSpeaking ? '🔊 播放中…' : '🔊 听整句'}
          </button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <input
            ref={writingInputRef}
            type="text"
            defaultValue=""
            key={current.en}
            placeholder={`首词 ${writingDisplay.answer.length} 个字母`}
            style={{
              padding: '10px 16px', fontSize: 16, borderRadius: 12,
              border: '2px solid #1976d2', width: '80%',
              textAlign: 'center', outline: 'none',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleWriting((e.target as HTMLInputElement).value)
              }
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
      recognitionAnswers.filter(a => a.correct).length +
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
          { name: t('basicenglish300.quizListening') || '听音选句', arr: listeningAnswers },
          { name: t('basicenglish300.quizRecognition') || '认句选义', arr: recognitionAnswers },
          { name: t('basicenglish300.quizWriting') || '拼写首词', arr: writingAnswers },
        ].map((sec, si) => (
          <div key={si} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{sec.name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sec.arr.map((a, i) => (
                <span key={i} style={{
                  width: 28, height: 28, borderRadius: 50,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600,
                  background: a.correct ? '#e8f5e9' : '#fce4ec',
                  color: a.correct ? '#2e7d32' : '#c62828',
                  border: `1px solid ${a.correct ? '#a5d6a7' : '#f5c6cb'}`,
                }}>
                  {a.correct ? '✓' : '✗'}
                </span>
              ))}
            </div>
          </div>
        ))}
        {isPassed && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <button
              onClick={handleUpload}
              style={{ padding: '12px 38px', fontSize: 15, borderRadius: 99, border: 'none', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
            >
              {t('basicenglish300.quizUpload') || '上传结果'} ({fullyCorrect.size} {t('basicenglish300.quizLessons') || '句'})
            </button>
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 28px', fontSize: 14, borderRadius: 99, border: '1px solid #d0d0d0', background: '#fff', color: '#333', cursor: 'pointer' }}
          >
            {t('basicenglish300.quizClose') || '关闭'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.42)',
        zIndex: 1500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          width: 'min(560px, 92vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '24px 22px 20px',
          boxShadow: '0 10px 32px rgba(0,0,0,0.19)',
        }}
      >
        {phase === 'intro' && renderIntro()}
        {phase === 'listening' && renderListening()}
        {phase === 'recognition' && renderRecognition()}
        {phase === 'writing' && renderWriting()}
        {phase === 'result' && renderResult()}
      </div>
    </div>
  )
}
