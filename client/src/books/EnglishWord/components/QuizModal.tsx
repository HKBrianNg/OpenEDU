// client/src/books/EnglishWord/components/QuizModal.tsx

import { useState, useEffect, useMemo } from 'react'
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

    const [phase, setPhase] = useState<QuizPhase>('intro')
    const [quizWords, setQuizWords] = useState<WordItem[]>([])
    const [listeningAnswers, setListeningAnswers] = useState<AnswerRecord[]>([])
    const [recognitionAnswers, setRecognitionAnswers] = useState<AnswerRecord[]>([])
    const [writingAnswers, setWritingAnswers] = useState<AnswerRecord[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [submitted, setSubmitted] = useState(false)

    // 当前章节的 learning 单词
    const learningWords = useMemo(() => {
        return words.filter(w => getWordStatus(w) === 'learning')
    }, [words, getWordStatus])

    // 打开时初始化
    useEffect(() => {
        if (open) {
            // 随机选 10 个（或全部，如果不足 10）
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

    // 达标判定：≥90 分
    const isPassed = score >= 90

    // 上传结果
    const handleUpload = () => {
        fullyCorrectWords.forEach(w => {
            setWordStatus(w, 'mastered')
        })
        onClose()
    }

    // 交卷
    // const handleSubmit = () => {
    //     setSubmitted(true)
    //     setPhase('result')
    //     stopSpeaking()
    // }

    // 退出
    const handleExit = () => {
        stopSpeaking()
        onClose()
    }

    // 当前题目（根据 phase 和 index）
    const currentWord = quizWords[currentIndex]

    // 各卷的选项
    const listeningOptions = useMemo(() => {
        if (phase !== 'listening' || !currentWord) return []
        return generateOptions(currentWord, words)
    }, [phase, currentWord, words])

    const recognitionOptions = useMemo(() => {
        if (phase !== 'recognition' || !currentWord) return []
        return generateOptions(currentWord, words)
    }, [phase, currentWord, words])

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
            // 当前卷完成，进入下一卷
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
        const correct = answer.trim().toLowerCase() === currentWord.en?.trim().toLowerCase()
        const record: AnswerRecord = {
            word: currentWord,
            correct,
            userAnswer: answer.trim(),
        }

        setWritingAnswers(prev => {
            const next = [...prev]
            next[currentIndex] = record
            return next
        })

        if (currentIndex < quizWords.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            setSubmitted(true)
            setPhase('result')
        }
    }

    // 渲染各卷内容
    const renderListening = () => {
        if (!currentWord) return null
        const imageSrc = getWordImageSrc(currentWord)

        return (
            <div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                        {t('englishword.quizListening') || '听音选词'} ({currentIndex + 1}/{quizWords.length})
                    </p>
                    <button
                        onClick={() => speak(currentWord.en || '', 'en-US', `quiz-${currentWord.en}`)}
                        style={{
                            padding: '12px 28px',
                            fontSize: 16,
                            borderRadius: 99,
                            border: 'none',
                            background: '#1976d2',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        {speakingId === `quiz-${currentWord.en}` ? '🔊 播放中...' : '🔊 播放发音'}
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
                            }}
                        >
                            {opt.en}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    const renderRecognition = () => {
        if (!currentWord) return null
        const imageSrc = getWordImageSrc(currentWord)

        return (
            <div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                        {t('englishword.quizRecognition') || '认词选义'} ({currentIndex + 1}/{quizWords.length})
                    </p>
                    <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>
                        {currentWord.name}
                    </div>
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
                            }}
                        >
                            {opt.en}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    const renderWriting = () => {
        if (!currentWord) return null
        const imageSrc = getWordImageSrc(currentWord)
        const sentence = currentWord.en_sentense || ''

        // 挖空显示
        const sentenceParts = sentence.split(currentWord.en || '')
        const displaySentence = sentenceParts.length > 1
            ? `${sentenceParts[0]}______${sentenceParts.slice(1).join(currentWord.en || '')}`
            : sentence

        return (
            <div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                        {t('englishword.quizWriting') || '拼写填空'} ({currentIndex + 1}/{quizWords.length})
                    </p>
                    <div style={{ fontSize: 18, fontStyle: 'italic', marginBottom: 12, padding: '0 16px' }}>
                        {displaySentence}
                    </div>
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
                        type="text"
                        defaultValue=""
                        key={currentWord.en}
                        placeholder="请输入英文单词"
                        style={{
                            padding: '10px 16px',
                            fontSize: 16,
                            borderRadius: 12,
                            border: '1px solid #d0d0d0',
                            width: '80%',
                            textAlign: 'center',
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                handleWriting((e.target as HTMLInputElement).value)
                            }
                        }}
                    />
                    <div style={{ marginTop: 12 }}>
                        <button
                            onClick={() => {
                                const input = document.querySelector('input[type="text"]') as HTMLInputElement
                                if (input) handleWriting(input.value)
                            }}
                            style={{
                                padding: '10px 28px',
                                fontSize: 14,
                                borderRadius: 99,
                                border: 'none',
                                background: '#1976d2',
                                color: '#fff',
                                cursor: 'pointer',
                            }}
                        >
                            {t('englishword.quizNext') || '下一题'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // 渲染结果页
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

                {/* 三卷对错标记 */}
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
                        onClick={handleExit}
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

    // 渲染介绍页
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
                        onClick={handleExit}
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
            onClick={handleExit}
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