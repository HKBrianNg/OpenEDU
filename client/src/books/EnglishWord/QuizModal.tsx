import { useState } from 'react'
import type { WordItem } from './types'
import { useLocale } from '../../store/LocaleContext'

interface QuizQuestion {
  item: WordItem
  options: string[]
  correctAnswer: string
}

interface QuizModalProps {
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

export default function QuizModal({ words, open, onClose }: QuizModalProps) {
  const { t } = useLocale()

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  function start() {
    if (!words || words.length === 0) return

    const pool = words.filter(w => getEnglishText(w))
    const count = Math.min(10, pool.length)
    const picked = shuffle(pool).slice(0, count)

    const qs: QuizQuestion[] = picked.map(item => {
      const correctAnswer = getEnglishText(item)
      const wrongPool = pool.filter(w => getEnglishText(w) !== correctAnswer)
      const wrongOptions = shuffle(wrongPool).slice(0, 3).map(getEnglishText)
      const options = shuffle([correctAnswer, ...wrongOptions])

      return { item, options, correctAnswer }
    })

    setQuestions(qs)
    setCurrentIndex(0)
    setSelected(null)
    setIsCorrect(null)
    setScore(0)
    setFinished(false)
  }

  function select(answer: string) {
    if (selected) return
    setSelected(answer)
    const correct = answer === questions[currentIndex].correctAnswer
    setIsCorrect(correct)
    if (correct) setScore(s => s + 1)
  }

  function next() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
      setSelected(null)
      setIsCorrect(null)
    } else {
      setFinished(true)
    }
  }

  function close() {
    setQuestions([])
    setCurrentIndex(0)
    setSelected(null)
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
        zIndex: 1400,
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
          width: 'min(500px, 90vw)',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '24px 22px 20px',
          boxShadow: '0 10px 32px rgba(0,0,0,0.19)',
        }}
      >
        {!finished && questions.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 660 }}>
                {t('englishword.quizTitle') || '词汇练习'}
              </h3>
              <span style={{ fontSize: 13, color: '#777' }}>
                {currentIndex + 1} / {questions.length}
              </span>
            </div>

            <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
              {t('englishword.quizChooseCorrect') || '选择对应的英文'}
            </p>

            <div
              style={{
                fontSize: 23,
                fontWeight: 640,
                color: '#222',
                margin: '14px 0 6px',
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
                  margin: '4px 0 18px',
                  lineHeight: 1.44,
                }}
              >
                {getHint(questions[currentIndex].item)}
              </p>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              {questions[currentIndex].options.map((option, idx) => {
                const isSel = selected === option
                const isAns = option === questions[currentIndex].correctAnswer
                const bg = !selected ? '#f6f8fb' : isAns ? '#e8f7ee' : isSel ? '#fdecea' : '#f6f8fb'
                const border = !selected ? '#e3e8ef' : isAns ? '#2ecc71' : isSel ? '#e74c3c' : '#e3e8ef'
                const color = !selected ? '#222' : isAns ? '#2ecc71' : isSel ? '#e74c3c' : '#888'

                return (
                  <button
                    key={`${option}-${idx}`}
                    onClick={() => select(option)}
                    disabled={!!selected}
                    style={{
                      textAlign: 'left',
                      padding: '11px 14px',
                      fontSize: 16,
                      borderRadius: 10,
                      border: `1.5px solid ${border}`,
                      background: bg,
                      color,
                      cursor: selected ? 'default' : 'pointer',
                      fontWeight: 535,
                    }}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {isCorrect !== null && (
              <div style={{ textAlign: 'center', marginTop: 18 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 542,
                    color: isCorrect ? '#2ecc71' : '#e74c3c',
                    marginBottom: 12,
                  }}
                >
                  {isCorrect
                    ? t('englishword.quizCorrect') || '✓ 正确！'
                    : t('englishword.quizWrong') || '✗ 不正确'}
                </p>
                <button
                  onClick={next}
                  style={{
                    padding: '9px 30px',
                    fontSize: 14,
                    borderRadius: 60,
                    border: 'none',
                    background: '#1976d2',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 502,
                  }}
                >
                  {currentIndex < questions.length - 1
                    ? t('englishword.quizNext') || '下一题'
                    : t('englishword.quizFinish') || '查看结果'}
                </button>
              </div>
            )}
          </>
        )}

        {finished && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <h3 style={{ fontSize: 21, fontWeight: 665, marginBottom: 12 }}>
              {t('englishword.quizResult') || '练习完成！'}
            </h3>
            <p style={{ fontSize: 56, fontWeight: 690, color: '#1976d2', margin: '10px 0' }}>
              {score}/{questions.length}
            </p>
            <p style={{ fontSize: 15, color: '#555', marginBottom: 24 }}>
              {score === questions.length
                ? t('englishword.quizPerfect') || '全部正确，太棒了！🎉'
                : score >= questions.length / 2
                  ? t('englishword.quizGood') || '做得不错，继续加油！👍'
                  : t('englishword.quizTryAgain') || '再接再厉，多练几次会更好！💪'}
            </p>
            <button
              onClick={close}
              style={{
                padding: '10px 38px',
                fontSize: 14,
                borderRadius: 55,
                border: 'none',
                background: '#1976d2',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 498,
              }}
            >
              {t('englishword.quizClose') || '关闭'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}