// client/src/books/EnglishWord/components/ActionBar.tsx

import { useLocale } from '../../../store/LocaleContext'

interface ActionBarProps {
    onExpandAll: () => void
    onCollapseAll: () => void
    onQuiz: () => void
    onSpellingQuiz: () => void
}

export default function ActionBar({
    onExpandAll,
    onCollapseAll,
    onQuiz,
    onSpellingQuiz,
}: ActionBarProps) {
    const { t } = useLocale()

    return (
        <div style={{
            display: 'flex',
            gap: 10,
            margin: '0 22px 20px',
        }}>
            <button
                onClick={onExpandAll}
                style={{
                    padding: '7px 18px',
                    fontSize: 14,
                    borderRadius: 99,
                    border: '1px solid #d0d0d0',
                    background: '#fff',
                    color: '#333',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                }}
            >
                {t('englishword.expandAll') ?? '全部展开'}
            </button>
            <button
                onClick={onCollapseAll}
                style={{
                    padding: '7px 18px',
                    fontSize: 14,
                    borderRadius: 99,
                    border: '1px solid #d0d0d0',
                    background: '#fff',
                    color: '#333',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                }}
            >
                {t('englishword.collapseAll') ?? '全部折叠'}
            </button>
            <button
                onClick={onQuiz}
                style={{
                    padding: '7px 18px',
                    fontSize: 14,
                    borderRadius: 99,
                    border: '1px solid #1976d2',
                    background: '#1976d2',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: 497,
                }}
            >
                {t('englishword.quiz') ?? '练习'}
            </button>
            <button
                onClick={onSpellingQuiz}
                style={{
                    padding: '7px 18px',
                    fontSize: 14,
                    borderRadius: 99,
                    border: '1px solid #2ecc71',
                    background: '#2ecc71',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: 498,
                }}
            >
                {t('englishword.spellingQuiz') || '拼写'}
            </button>
        </div>
    )
}