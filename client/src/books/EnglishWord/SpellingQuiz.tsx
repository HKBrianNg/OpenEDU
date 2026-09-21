import { useState } from 'react'
import type { WordItem } from './types'
import { useLocale } from '../../store/LocaleContext'

interface SpellingQuestion {
  item: WordItem
  answer: string
}

interface SpellingQuizProps {
  words: WordItem[]
  open: boolean
  onClose: () => void
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

  const [questions, setQuestions] = useState<SpellingQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

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
  }

  function handleSubmit() {
    if (submitted) return
    const trimmed = inputValue.trim().toLowerCase()
    const correct = trimmed === questions[currentIndex].answer.toLowerCase()
    setIsCorrect(correct)
    setSubmitted(true)
    if (correct) setScore(s => s + 1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !submitted) {
      handleSubmit()
    }
  }

  function next() {
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
    setQuestions([])
    setCurrentIndex(0)
    setInputValue('')
    setSubmitted(false)
    setIsCorrect(null)
    setScore(0)
    setFinished(false)
    onClose()
  }

  if (open && questions.length === 0 && !finished) {
    start()
  }

  if (!open) return null

  return (
    <div
      onClick={close}
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
          width: 'min(460px, 90vw)',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '26px 24px 22px',
          boxShadow: '0 10px 34px rgba(0,0,0,0.195)',
        }}
      >
        {!finished && questions.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 662 }}>
                {t('spellingquiz.title') || '拼写练习'}
              </h3>
              <span style={{ fontSize: 13, color: '#777' }}>
                {currentIndex + 1} / {questions.length}
              </span>
            </div>

            <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
              {t('spellingquiz.prompt') || '请输入对应的英文单词'}
            </p>

            <div
              style={{
                fontSize: 29,
                fontWeight: 652,
                color: '#222',
                margin: '18px 0 10px',
                textAlign: 'center',
              }}
            >
              {getDisplayText(questions[currentIndex].item)}
            </div>

            {getHint(questions[currentIndex].item) && (
              <p
                style={{
                  fontSize: 14,
                  color: '#888',
                  textAlign: 'center',
                  margin: '2px 0 18px',
                  lineHeight: 1.44,
                }}
              >
                {getHint(questions[currentIndex].item)}
              </p>
            )}

            <div style={{ margin: '16px 0' }}>
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={submitted}
                placeholder={t('spellingquiz.inputPlaceholder') || '输入英文单词...'}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 18,
                  borderRadius: 10,
                  border: submitted
                    ? isCorrect
                      ? '2px solid #2ecc71'
                      : '2px solid #e74c3c'
                    : '2px solid #d0d0d0',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.25s',
                  textAlign: 'center',
                  letterSpacing: 1,
                }}
              />
            </div>

            {submitted && (
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 544,
                    color: isCorrect ? '#2ecc71' : '#e74c3c',
                    margin: '8px 0 4px',
                  }}
                >
                  {isCorrect
                    ? t('spellingquiz.correct') || '✓ 正确！'
                    : t('spellingquiz.wrong') || '✗ 不正确'}
                </p>
                {!isCorrect && (
                  <p style={{ fontSize: 14, color: '#666', margin: '4px 0 0' }}>
                    {t('spellingquiz.correctAnswer') || '正确答案：'} {questions[currentIndex].answer}
                  </p>
                )}
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 10 }}>
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim()}
                  style={{
                    padding: '10px 36px',
                    fontSize: 15,
                    borderRadius: 54,
                    border: 'none',
                    background: inputValue.trim() ? '#1976d2' : '#ccc',
                    color: '#fff',
                    cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 506,
                    transition: 'background 0.2s',
                  }}
                >
                  {t('spellingquiz.submit') || '提交'}
                </button>
              ) : (
                <button
                  onClick={next}
                  style={{
                    padding: '10px 33px',
                    fontSize: 15,
                    borderRadius: 52,
                    border: 'none',
                    background: '#1976d2',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 504,
                  }}
                >
                  {currentIndex < questions.length - 1
                    ? t('spellingquiz.next') || '下一题'
                    : t('spellingquiz.finish') || '查看结果'}
                </button>
              )}
            </div>
          </>
        )}

        {finished && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h3 style={{ fontSize: 21, fontWeight: 667, marginBottom: 12 }}>
              {t('spellingquiz.result') || '拼写练习完成！'}
            </h3>
            <p style={{ fontSize: 59, fontWeight: 694, color: '#1976d2', margin: '12px 0' }}>
              {score}/{questions.length}
            </p>
            <p style={{ fontSize: 15, color: '#555', marginBottom: 26 }}>
              {score === questions.length
                ? t('spellingquiz.perfect') || '全部正确，太棒了！🎉'
                : score >= questions.length / 2
                  ? t('spellingquiz.good') || '做得不错，继续加油！👍'
                  : t('spellingquiz.tryAgain') || '再接再厉，多练几次会更好！💪'}
            </p>
            <button
              onClick={close}
              style={{
                padding: '10px 40px',
                fontSize: 14,
                borderRadius: 57,
                border: 'none',
                background: '#1976d2',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 501,
              }}
            >
              {t('spellingquiz.close') || '关闭'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}