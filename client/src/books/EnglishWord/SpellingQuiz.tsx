import { useState, useEffect, useRef } from 'react'
import type { WordItem } from './types'
import { useLocale } from '../../store/LocaleContext'
import { getCourseImageUrl } from '../../utils/coursePath'

const COURSE_ID = 'EnglishWord'

interface SpellingQuestion {
  item: WordItem
  answer: string
}
interface SpellingQuizProps {
  words: WordItem[]
  open: boolean
  onClose: () => void
}

function getImageName(en?: string) {
  return (
    en
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') + '.jpg'
  )
}

function getWordImageSrc(item: WordItem) {
  const imageName = item.url?.trim()
    ? item.url
    : item.en
      ? getImageName(item.en)
      : undefined
  return getCourseImageUrl(COURSE_ID, imageName)
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function getDisplayText(item: WordItem): string {
  return item.name || item.en || ''
}
function getEnglishText(item: WordItem): string {
  return (item.en || item.name || '').trim()
}
function getHint(item: WordItem): string {
  return item.zh_sentense || item.en_sentense || ''
}

export default function SpellingQuiz({ words, open, onClose }: SpellingQuizProps) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const autoNextTimerRef = useRef<number | null>(null)

  const [questions, setQuestions] = useState<SpellingQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  function speak(text: string) {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.76
    utterance.pitch = 1
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  function start() {
    if (!words || words.length === 0) return
    const pool = words.filter(w => getEnglishText(w))
    const count = Math.min(10, pool.length)
    const picked = shuffle(pool).slice(0, count)
    const qs: SpellingQuestion[] = picked.map(item => ({
      item,
      answer: getEnglishText(item),
    }))
    setQuestions(qs)
    setCurrentIndex(0)
    setInputValue('')
    setSubmitted(false)
    setIsCorrect(null)
    setScore(0)
    setFinished(false)
    clearAutoTimer()
  }

  function clearAutoTimer() {
    if (autoNextTimerRef.current !== null) {
      window.clearTimeout(autoNextTimerRef.current)
      autoNextTimerRef.current = null
    }
  }

  useEffect(() => {
    if (open && questions.length === 0 && !finished) {
      start()
    }
  }, [open])

  useEffect(() => {
    if (open && !finished && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open, currentIndex, finished, submitted])

  useEffect(() => {
    if (!finished && questions.length > 0 && !submitted) {
      const word = getEnglishText(questions[currentIndex].item)
      setTimeout(() => speak(`How do you spell ${word}?`), 380)
    }
  }, [currentIndex, finished, submitted, questions])


  function handleCheck() {
    if (submitted) return
    const trimmed = inputValue.trim().toLowerCase()
    const correct = trimmed === questions[currentIndex].answer.toLowerCase()
    setIsCorrect(correct)
    setSubmitted(true)
    if (correct) setScore(s => s + 1)

    if (correct) {
      autoNextTimerRef.current = window.setTimeout(() => {
        goNext()
      }, 1200)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (!submitted) {
        handleCheck()
      } else {
        goNext()
      }
    }
  }

  function goNext() {
    clearAutoTimer()
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
      setInputValue('')
      setSubmitted(false)
      setIsCorrect(null)
    } else {
      setFinished(true)
    }
  }

  function close() {
    clearAutoTimer()
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setQuestions([])
    setCurrentIndex(0)
    setInputValue('')
    setSubmitted(false)
    setIsCorrect(null)
    setScore(0)
    setFinished(false)
    onClose()
  }

  useEffect(() => {
    return () => {
      clearAutoTimer()
    }
  }, [])

  if (!open) return null
  const currentItem = questions[currentIndex]?.item
  const imgSrc = currentItem ? getWordImageSrc(currentItem) : undefined

  return (
    <div
      onClick={close}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.402)',
        zIndex: 2100,
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
          width: 'min(392px, 85vw)',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '20px 16px 14px',
          boxShadow: '0 8px 34px rgba(0,0,0,0.148)',
        }}
      >
        {!finished && questions.length > 0 && (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 612 }}>
                {t('spellingquiz.title') || 'Spelling Quiz'}
              </h3>
              <span style={{ fontSize: 11, color: '#888', fontWeight: 448 }}>
                {currentIndex + 1} / {questions.length}
              </span>
            </div>

            {/* 单词配图：复用项目原有 getWordImageSrc 逻辑 */}
            {imgSrc && (
              <div style={{ textAlign: 'center', margin: '8px 0' }}>
                <img
                  src={imgSrc}
                  alt="illustration"
                  style={{
                    maxWidth: 180,
                    maxHeight: 160,
                    borderRadius: 10,
                    objectFit: 'contain'
                  }}
                  onError={(ev) => {
                    (ev.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}

            <div style={{
              fontSize: 44,
              fontWeight: 718,
              color: '#222',
              textAlign: 'center',
              margin: '8px 0 10px',
            }}>
              {getDisplayText(questions[currentIndex].item)}
            </div>

            {getHint(questions[currentIndex].item) && (
              <p style={{
                fontSize: 11,
                color: '#999',
                textAlign: 'center',
                margin: '2px 0 10px',
                lineHeight: 1.40,
                fontStyle: 'italic',
              }}>
                {getHint(questions[currentIndex].item)}
              </p>
            )}

            <div style={{ margin: '6px 0 4px' }}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !submitted && inputValue.trim()) {
                    handleCheck()
                  }
                }}
                disabled={submitted}
                placeholder={t('spellingquiz.inputPlaceholder') || 'Type the word...'}
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  fontSize: 15,
                  borderRadius: 7,
                  border: submitted
                    ? isCorrect
                      ? '2.5px solid #2ecc71'
                      : '2.5px solid #e74c3c'
                    : '2.5px solid #ddd',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  textAlign: 'center',
                  letterSpacing: 0.9,
                  backgroundColor: submitted ? (isCorrect ? '#f0fff4' : '#fff5f5') : '#fff',
                }}
              />
            </div>

            {submitted && (
              <div style={{ textAlign: 'center', margin: '4px 0 2px' }}>
                <p style={{
                  fontSize: 12,
                  fontWeight: 546,
                  color: isCorrect ? '#27ae60' : '#e74c3c',
                  margin: '1px 0',
                }}>
                  {isCorrect
                    ? (t('spellingquiz.correct') || '✓ Correct!')
                    : (t('spellingquiz.wrong') || '✗ Incorrect')}
                </p>
                {!isCorrect && (
                  <p style={{
                    fontSize: 11,
                    color: '#888',
                    margin: '1px 0 0',
                  }}>
                    {t('spellingquiz.correctAnswer') || 'Correct answer: '}
                    <span style={{ fontWeight: 575, color: '#333' }}>
                      {questions[currentIndex].answer}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 6 }}>
              {!submitted ? (
                <button
                  onClick={handleCheck}
                  disabled={!inputValue.trim()}
                  style={{
                    padding: '7px 118px',
                    fontSize: 12,
                    fontWeight: 480,
                    borderRadius: 96,
                    border: 'none',
                    background: inputValue.trim() ? '#1976d2' : '#ccc',
                    color: '#fff',
                    cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s',
                  }}
                >
                  {t('spellingquiz.submit') || 'Submit'}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  style={{
                    padding: '7px 108px',
                    fontSize: 12,
                    fontWeight: 464,
                    borderRadius: 90,
                    border: 'none',
                    background: '#1976d2',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {currentIndex < questions.length - 1
                    ? (t('spellingquiz.next') || 'Next')
                    : (t('spellingquiz.finish') || 'See Results')}
                </button>
              )}
            </div>
          </>
        )}

        {finished && (
          <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 622, marginBottom: 4 }}>
              {t('spellingquiz.result') || 'Spelling Complete!'}
            </h3>
            <p style={{
              fontSize: 50,
              fontWeight: 662,
              color: '#1976d2',
              margin: '4px 0',
              lineHeight: 1.02,
            }}>
              {score}/{questions.length}
            </p>
            <p style={{ fontSize: 11, color: '#666', marginBottom: 18 }}>
              {score === questions.length
                ? (t('spellingquiz.perfect') || 'Perfect Score! 🎉')
                : score >= questions.length / 2
                  ? (t('spellingquiz.good') || 'Great Job! 👍')
                  : (t('spellingquiz.tryAgain') || 'Keep Practicing! 💪')}
            </p>
            <button
              onClick={close}
              style={{
                padding: '7px 146px',
                fontSize: 11,
                fontWeight: 452,
                borderRadius: 128,
                border: 'none',
                background: '#1976d2',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {t('spellingquiz.close') || 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}