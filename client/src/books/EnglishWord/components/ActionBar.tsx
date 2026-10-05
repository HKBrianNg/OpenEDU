// client/src/books/EnglishWord/components/ActionBar.tsx

import { useLocale } from '../../../store/LocaleContext'

interface ActionBarProps {
    onExpandAll: () => void
    onCollapseAll: () => void
    onQuiz: () => void
    onSpellingQuiz: () => void
    onQuizProgress: () => void
}

export default function ActionBar({
    onExpandAll,
    onCollapseAll,
    onQuiz,
    onSpellingQuiz,
    onQuizProgress,
}: ActionBarProps) {
    const { t } = useLocale()

    const btnStyle = (bg: string, border: string, color: string): React.CSSProperties => ({
        padding: '7px 18px',
        fontSize: 14,
        borderRadius: 99,
        border: `1px solid ${border}`,
        background: bg,
        color,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontWeight: 497,
    })

    return (
        <div style={{
            display: 'flex',
            gap: 10,
            margin: '0 22px 20px',
            flexWrap: 'wrap',
        }}>
            <button onClick={onExpandAll} style={btnStyle('#fff', '#d0d0d0', '#333')}>
                {t('englishword.expandAll') ?? '全部展开'}
            </button>
            <button onClick={onCollapseAll} style={btnStyle('#fff', '#d0d0d0', '#333')}>
                {t('englishword.collapseAll') ?? '全部折叠'}
            </button>
            <button onClick={onQuiz} style={btnStyle('#1976d2', '#1976d2', '#fff')}>
                {t('englishword.quiz') ?? '练习'}
            </button>
            <button onClick={onSpellingQuiz} style={btnStyle('#2ecc71', '#2ecc71', '#fff')}>
                {t('englishword.spellingQuiz') || '拼写'}
            </button>
            <button onClick={onQuizProgress} style={btnStyle('#722ed1', '#722ed1', '#fff')}>
                {t('englishword.quizProgress') || '测验'}
            </button>
        </div>
    )
}