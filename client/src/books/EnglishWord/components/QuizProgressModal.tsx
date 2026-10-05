// client/src/books/EnglishWord/components/QuizProgressModal.tsx

import { useState, useEffect } from 'react'
import type { WordItem } from '../types'
import { useLocale } from '../../../store/LocaleContext'
import type { WordStatus } from '../hooks/useProgress'

interface QuizProgressModalProps {
    words: WordItem[]
    getWordStatus: (item: WordItem) => WordStatus
    open: boolean
    onClose: () => void
}

export default function QuizProgressModal({
    words,
    getWordStatus,
    open,
    onClose,
}: QuizProgressModalProps) {
    const { t } = useLocale()
    const [learningWords, setLearningWords] = useState<WordItem[]>([])

    useEffect(() => {
        if (open) {
            const learning = words.filter(w => getWordStatus(w) === 'learning')
            setLearningWords(learning)
        }
    }, [open, words, getWordStatus])

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
                    width: 'min(500px, 90vw)',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    padding: '24px 22px 20px',
                    boxShadow: '0 10px 32px rgba(0,0,0,0.19)',
                }}
            >
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 660, marginBottom: 16 }}>
                    {t('englishword.quizProgressTitle') || '学习测验'}
                </h3>

                {learningWords.length === 0 ? (
                    <p style={{ fontSize: 15, color: '#555', textAlign: 'center', padding: '20px 0' }}>
                        {t('englishword.noLearningWords') || '当前章节没有学习中（learning）的单词'}
                    </p>
                ) : (
                    <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
                        {t('englishword.quizProgressCount') || '共有'} {learningWords.length} {t('englishword.quizProgressWords') || '个单词待测验'}
                    </p>
                )}

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button
                        onClick={onClose}
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
            </div>
        </div>
    )
}