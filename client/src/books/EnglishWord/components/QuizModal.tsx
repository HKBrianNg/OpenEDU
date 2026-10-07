// client/src/books/EnglishWord/components/QuizModal.tsx

import { useState, useEffect, useMemo, useRef } from 'react'
import type { WordItem } from '../types'
import { getCourseBaseUrl } from '../../../utils/coursePath'
import { useLocale } from '../../../store/LocaleContext'
import { useSpeech } from '../hooks/useSpeech'
import type { WordStatus } from '../hooks/useProgress'

const COURSE_ID = 'EnglishWord'

interface QuizModalProps {
    words: WordItem[]
    getWordStatus: (item: WordItem) => WordStatus
    setWordStatus: (item: WordItem, status: WordStatus) => void
    open: boolean
    onClose: () => void
}

type QuizPhase = 'intro' | 'listening' | 'recognition' | 'writing' | 'result'

interface AnswerRecord {
    word: WordItem
    correct: boolean
    userAnswer: string
}

// 图片生成（与教学组件逻辑一致，但独立实现）
function getImageName(en?: string) {
    return en?.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.jpg'
}

function getWordImageSrc(item: WordItem) {
    const imageName = item.url?.trim()
        ? item.url
        : item.en
            ? getImageName(item.en)
            : undefined
    return imageName ? `${getCourseBaseUrl(COURSE_ID)}/content/${imageName}` : undefined
}

// 生成干扰项（从当前章节其他单词中选）
function generateOptions(correctWord: WordItem, allWords: WordItem[], count = 4): WordItem[] {
    const others = allWords.filter(w => w.en !== correctWord.en && w.name !== correctWord.name)
    const shuffled = [...others].sort(() => Math.random() - 0.5)
    const options = shuffled.slice(0, count - 1)
    options.push(correctWord)
    return [...options].sort(() => Math.random() - 0.5)
}

export default function QuizModal({
    words,
    getWordStatus,
    setWordStatus,
    open,
    onClose,
}: QuizModalProps) {
    const { t } = useLocale()
    const { speakingId, speak, stopSpeaking } = useSpeech()
    const speakRef = useRef(speak)

    // 同步最新的 speak 到 ref（防止闭包陷阱）
    useEffect(() => {
        speakRef.current = speak
    }, [speak])

    const [phase, setPhase] = useState<QuizPhase>('intro')
    const [quizWords, setQuizWords] = useState<WordItem[]>([])
    const [listeningAnswers, setListeningAnswers] = useState<AnswerRecord[]>([])
    const [recognitionAnswers, setRecognitionAnswers] = useState<AnswerRecord[]>([])
    const [writingAnswers, setWritingAnswers] = useState<AnswerRecord[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [submitted, setSubmitted] = useState(false)

    const writingInputRef = useRef<HTMLInputElement>(null)

    // 当前章节的 learning 单词
    const learningWords = useMemo(() => {
        return words.filter(w => getWordStatus(w) === 'learning')
    }, [words, getWordStatus])

    // 当前题目（提前声明，修复 TS2448/TS2454）
    const currentWord = quizWords[currentIndex]

    // 打开时初始化
    useEffect(() => {
        if (open) {
            const count = Math.min(10, learningWords.length)
            const shuffled = [...learningWords].sort(() => Math.random() - 0.5)
            const selected = shuffled.slice(0, count)
            setQuizWords(selected)
            setPhase('intro')
            setListeningAnswers([])
            setRecognitionAnswers([])
            setWritingAnswers([])
            setCurrentIndex(0)
            setSubmitted(false)
            stopSpeaking()
        }
    }, [open, learningWords, stopSpeaking])

    // 自动发声：听卷读英文，认词选义读中文，拼写卷读整句
    useEffect(() => {
        if (!currentWord) return

        if (phase === 'listening') {
            const enText = currentWord.en || ''
            if (enText) {
                speakRef.current(enText, 'en-US', `quiz-listening-${currentWord.en}`)
            }
        } else if (phase === 'recognition') {
            // 认词选义：读中文（name 字段）
            const cnText = currentWord.name || ''
            if (cnText) {
                speakRef.current(cnText, 'zh-CN', `quiz-recognition-${currentWord.en}`)
            }
        } else if (phase === 'writing') {
            // 拼写卷：读整句（en_sentense 字段）
            const sentence = currentWord.en_sentense || ''
            if (sentence) {
                speakRef.current(sentence, 'en-US', `quiz-writing-${currentWord.en}`)
            }
        }
    }, [phase, currentIndex, currentWord])

    // 拼写卷：进入每题自动 Focus 输入框
    useEffect(() => {
        if (phase === 'writing' && writingInputRef.current) {
            writingInputRef.current.focus()
        }
    }, [phase, currentIndex])

    // 计算分数
    const score = useMemo(() => {
        if (!submitted) return 0
        const listenScore = listeningAnswers.filter(a => a.correct).length * 2
        const recognizeScore = recognitionAnswers.filter(a => a.correct).length * 4
        const writeScore = writingAnswers.filter(a => a.correct).length * 4
        return listenScore + recognizeScore + writeScore
    }, [submitted, listeningAnswers, recognitionAnswers, writingAnswers])

    // 三卷全对的单词
    const fullyCorrectWords = useMemo(() => {
        if (!submitted) return []
        const listenCorrect = new Set(listeningAnswers.filter(a => a.correct).map(a => a.word.en))
        const recognizeCorrect = new Set(recognitionAnswers.filter(a => a.correct).map(a => a.word.en))
        const writeCorrect = new Set(writingAnswers.filter(a => a.correct).map(a => a.word.en))
        return quizWords.filter(w =>
            listenCorrect.has(w.en) && recognizeCorrect.has(w.en) && writeCorrect.has(w.en)
        )
    }, [submitted, listeningAnswers, recognitionAnswers, writingAnswers, quizWords])

    const isPassed = score >= 90

    // 上传结果
    const handleUpload = () => {
        fullyCorrectWords.forEach(w => {
            setWordStatus(w, 'mastered')
        })
        onClose()
    }

    // 处理选择题作答
    const handleChoice = (phaseType: 'listening' | 'recognition', selectedWord: WordItem) => {
        if (submitted || !currentWord) return
        const correct = selectedWord.en === currentWord.en
        const record: AnswerRecord = {
            word: currentWord,
            correct,
            userAnswer: selectedWord.en || '',
        }

        if (phaseType === 'listening') {
            setListeningAnswers(prev => {
                const next = [...prev]
                next[currentIndex] = record
                return next
            })
        } else {
            setRecognitionAnswers(prev => {
                const next = [...prev]
                next[currentIndex] = record
                return next
            })
        }

        // 自动下一题
        if (currentIndex < quizWords.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            if (phaseType === 'listening') {
                setPhase('recognition')
                setCurrentIndex(0)
            } else {
                setPhase('writing')
                setCurrentIndex(0)
            }
        }
    }

    // 处理填充题作答
    const handleWriting = (answer: string) => {
        if (submitted || !currentWord) return
        const trimmed = answer.trim()
        if (!trimmed) return // 空答案不提交
        const correct = trimmed.toLowerCase() === currentWord.en?.trim().toLowerCase()
        const record: AnswerRecord = {
            word: currentWord,
            correct,
            userAnswer: trimmed,
        }

        setWritingAnswers(prev => {
            const next = [...prev]
            next[currentIndex] = record
            return next
        })

        if (currentIndex < quizWords.length - 1) {
            setCurrentIndex(prev => prev + 1)
            // Focus 会在 useEffect 中自动处理
        } else {
            setSubmitted(true)
            setPhase('result')
        }
    }

    // 各卷的选项
    const listeningOptions = useMemo(() => {
        if (phase !== 'listening' || !currentWord) return []
        return generateOptions(currentWord, words)
    }, [phase, currentWord, words])

    const recognitionOptions = useMemo(() => {
        if (phase !== 'recognition' || !currentWord) return []
        return generateOptions(currentWord, words)
    }, [phase, currentWord, words])

    // 听卷渲染
    const renderListening = () => {
        if (!currentWord) return null
        const imageSrc = getWordImageSrc(currentWord)
        const enText = currentWord.en || ''

        return (
            <div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                        {t('englishword.quizListening') || '听音选词'} ({currentIndex + 1}/{quizWords.length})
                    </p>
                    <button
                        onClick={() => {
                            if (enText) speakRef.current(enText, 'en-US', `quiz-listening-${currentWord.en}`)
                        }}
                        style={{
                            padding: '10px 24px',
                            fontSize: 15,
                            borderRadius: 99,
                            border: '1px solid #d0d0d0',
                            background: speakingId === `quiz-listening-${currentWord.en}` ? '#e3f2fd' : '#fff',
                            color: '#1976d2',
                            cursor: 'pointer',
                        }}
                    >
                        {speakingId === `quiz-listening-${currentWord.en}` ? '🔊 播放中...' : '🔊 重新播放'}
                    </button>
                    {imageSrc && (
                        <div style={{ marginTop: 12 }}>
                            <img
                                src={imageSrc}
                                alt={currentWord.name}
                                style={{ maxWidth: 160, maxHeight: 120, objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {listeningOptions.map(opt => (
                        <button
                            key={opt.en}
                            onClick={() => handleChoice('listening', opt)}
                            style={{
                                padding: '12px 16px',
                                fontSize: 16,
                                borderRadius: 12,
                                border: '1px solid #d0d0d0',
                                background: '#fff',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.15s',
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

    // 认卷渲染
    const renderRecognition = () => {
        if (!currentWord) return null
        const imageSrc = getWordImageSrc(currentWord)
        const cnText = currentWord.name || ''

        return (
            <div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                        {t('englishword.quizRecognition') || '认词选义'} ({currentIndex + 1}/{quizWords.length})
                    </p>
                    <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>
                        {cnText}
                    </div>
                    <button
                        onClick={() => {
                            if (cnText) speakRef.current(cnText, 'zh-CN', `quiz-recognition-${currentWord.en}`)
                        }}
                        style={{
                            padding: '10px 24px',
                            fontSize: 15,
                            borderRadius: 99,
                            border: '1px solid #d0d0d0',
                            background: speakingId === `quiz-recognition-${currentWord.en}` ? '#e3f2fd' : '#fff',
                            color: '#1976d2',
                            cursor: 'pointer',
                            marginBottom: 12,
                        }}
                    >
                        {speakingId === `quiz-recognition-${currentWord.en}` ? '🔊 播放中...' : '🔊 重读中文'}
                    </button>
                    {imageSrc && (
                        <div>
                            <img
                                src={imageSrc}
                                alt={currentWord.name}
                                style={{ maxWidth: 160, maxHeight: 120, objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {recognitionOptions.map(opt => (
                        <button
                            key={opt.en}
                            onClick={() => handleChoice('recognition', opt)}
                            style={{
                                padding: '12px 16px',
                                fontSize: 16,
                                borderRadius: 12,
                                border: '1px solid #d0d0d0',
                                background: '#fff',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.15s',
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

    // 拼写卷渲染
    const renderWriting = () => {
        if (!currentWord) return null
        const imageSrc = getWordImageSrc(currentWord)
        const word = currentWord.en || ''
        const sentenceText = currentWord.en_sentense || ''

        // 生成掩码题干：将目标单词替换为下划线（忽略大小写，只替换第一次出现）
        const displaySentence = sentenceText
            ? sentenceText.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '_'.repeat(word.length))
            : ''

        return (
            <div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                        {t('englishword.quizWriting') || '拼写填空'} ({currentIndex + 1}/{quizWords.length})
                    </p>

                    {/* 显示掩码后的句子（不暴露目标词） */}
                    <div style={{ fontSize: 20, fontStyle: 'italic', marginBottom: 12, padding: '0 16px' }}>
                        {displaySentence || '（无例句）'}
                    </div>

                    {/* 重读完整原句（发音不变，依然是整句） */}
                    {sentenceText && (
                        <button
                            onClick={() => speakRef.current(sentenceText, 'en-US', `quiz-writing-${word}`)}
                            style={{
                                padding: '10px 24px',
                                fontSize: 15,
                                borderRadius: 99,
                                border: '1px solid #d0d0d0',
                                background: speakingId === `quiz-writing-${word}` ? '#e3f2fd' : '#fff',
                                color: '#1976d2',
                                cursor: 'pointer',
                                marginBottom: 12,
                            }}
                        >
                            {speakingId === `quiz-writing-${word}` ? '🔊 播放中...' : '🔊 重读句子'}
                        </button>
                    )}

                    {imageSrc && (
                        <div>
                            <img
                                src={imageSrc}
                                alt={currentWord.name}
                                style={{ maxWidth: 160, maxHeight: 120, objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ textAlign: 'center' }}>
                    <input
                        ref={writingInputRef}
                        type="text"
                        defaultValue=""
                        key={word}
                        placeholder={`请输入英文单词（${word.length}个字母）`}
                        autoFocus
                        style={{
                            padding: '10px 16px',
                            fontSize: 16,
                            borderRadius: 12,
                            border: '2px solid #1976d2',
                            width: '80%',
                            textAlign: 'center',
                            outline: 'none',
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleWriting((e.target as HTMLInputElement).value)
                            }
                        }}
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                        {t('englishword.quizWritingHint') || '按 Enter 提交并进入下一题'}
                    </div>
                </div>
            </div>
        )
    }

    // 结果页渲染
    const renderResult = () => {
        const totalQuestions = quizWords.length * 3
        const correctCount = listeningAnswers.filter(a => a.correct).length
            + recognitionAnswers.filter(a => a.correct).length
            + writingAnswers.filter(a => a.correct).length

        return (
            <div>
                <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 660, textAlign: 'center' }}>
                    {t('englishword.quizResult') || '测验结果'}
                </h3>

                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 42, fontWeight: 700, color: isPassed ? '#2e7d32' : '#c62828' }}>
                        {score} / 100
                    </div>
                    <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                        {t('englishword.quizCorrectCount') || '答对'} {correctCount} / {totalQuestions} {t('englishword.quizQuestions') || '题'}
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                        {t('englishword.quizListening') || '听音选词'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {listeningAnswers.map((a, i) => (
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

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                        {t('englishword.quizRecognition') || '认词选义'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {recognitionAnswers.map((a, i) => (
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

                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                        {t('englishword.quizWriting') || '拼写填空'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {writingAnswers.map((a, i) => (
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

                {isPassed && (
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <button
                            onClick={handleUpload}
                            style={{
                                padding: '12px 38px',
                                fontSize: 15,
                                borderRadius: 99,
                                border: 'none',
                                background: '#2e7d32',
                                color: '#fff',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            {t('englishword.quizUpload') || '上传结果'} ({fullyCorrectWords.length} {t('englishword.quizWords') || '词'})
                        </button>
                    </div>
                )}

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 28px',
                            fontSize: 14,
                            borderRadius: 99,
                            border: '1px solid #d0d0d0',
                            background: '#fff',
                            color: '#333',
                            cursor: 'pointer',
                        }}
                    >
                        {t('englishword.quizClose') || '关闭'}
                    </button>
                </div>
            </div>
        )
    }

    // 介绍页渲染
    const renderIntro = () => {
        return (
            <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 660 }}>
                    {t('englishword.quizTitle') || '词汇测验'}
                </h3>
                <p style={{ fontSize: 15, color: '#555', marginBottom: 8 }}>
                    {t('englishword.quizIntro') || '本次测验共 3 卷，30 题，满分 100 分'}
                </p>
                <p style={{ fontSize: 14, color: '#777', marginBottom: 20 }}>
                    {t('englishword.quizIntroDetail') || '第1卷：听音选词（每题2分）→ 第2卷：认词选义（每题4分）→ 第3卷：拼写填空（每题4分）'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                    <button
                        onClick={() => { setPhase('listening'); setCurrentIndex(0) }}
                        style={{
                            padding: '12px 38px',
                            fontSize: 15,
                            borderRadius: 99,
                            border: 'none',
                            background: '#1976d2',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        {t('englishword.quizStart') || '开始测验'}
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '12px 28px',
                            fontSize: 15,
                            borderRadius: 99,
                            border: '1px solid #d0d0d0',
                            background: '#fff',
                            color: '#333',
                            cursor: 'pointer',
                        }}
                    >
                        {t('englishword.quizExit') || '退出'}
                    </button>
                </div>
            </div>
        )
    }

    if (!open) return null

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
                    width: 'min(600px, 92vw)',
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