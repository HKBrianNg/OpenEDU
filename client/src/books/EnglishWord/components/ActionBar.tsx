// client/src/books/EnglishWord/components/ActionBar.tsx

import { useLocale } from '../../../store/LocaleContext'

interface ActionBarProps {
    onExpandAll: () => void
    onCollapseAll: () => void
    onLearn: () => void
    onSpellingPractice: () => void
    onQuizProgress: () => void
}

export default function ActionBar({
    onExpandAll,
    onCollapseAll,
    onLearn,
    onSpellingPractice,
    onQuizProgress,
}: ActionBarProps) {
    const { t } = useLocale()

    const buttonStyle = {
        padding: '6px 14px',
        fontSize: 13,
        borderRadius: 99,
        border: '1px solid #d0d0d0',
        background: '#fff',
        color: '#333',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    }

    return (
        <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px', flexWrap: 'wrap' }}>
            <button onClick={onExpandAll} style={buttonStyle}>
                {t('englishword.expandAll') || '展开全部'}
            </button>
            <button onClick={onCollapseAll} style={buttonStyle}>
                {t('englishword.collapseAll') || '折叠全部'}
            </button>
            <button onClick={onLearn} style={buttonStyle}>
                {t('englishword.learn') || '学习(选义)'}
            </button>
            <button onClick={onSpellingPractice} style={buttonStyle}>
                {t('englishword.spellingPractice') || '拼写练习'}
            </button>
            <button onClick={onQuizProgress} style={buttonStyle}>
                {t('englishword.quizProgress') || '测验进度'}
            </button>
        </div>
    )
}