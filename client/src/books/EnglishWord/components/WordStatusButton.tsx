// client/src/books/EnglishWord/components/WordStatusButton.tsx

import { useLocale } from '../../../store/LocaleContext'
import type { WordStatus } from '../hooks/useProgress'

interface WordStatusButtonProps {
    status: WordStatus
    progressLoaded: boolean
    onClick: () => void
}

export default function WordStatusButton({
    status,
    progressLoaded,
    onClick,
}: WordStatusButtonProps) {
    const { t } = useLocale()

    const config = {
        pending: {
            label: t('englishword.statusPending') || '待学习',
            bg: '#fff',
            border: '#d0d0d0',
            color: '#333',
            cursor: progressLoaded ? 'pointer' : 'not-allowed',
        },
        learning: {
            label: t('englishword.statusLearning') || '学习中',
            bg: '#e6f4ff',
            border: '#91caff',
            color: '#0958d9',
            cursor: progressLoaded ? 'pointer' : 'not-allowed',
        },
        mastered: {
            label: t('englishword.statusMastered') || '已掌握',
            bg: '#f6ffed',
            border: '#b7eb8f',
            color: '#389e0d',
            cursor: 'not-allowed',
        },
    }[status]

    return (
        <button
            onClick={onClick}
            disabled={status === 'mastered' || !progressLoaded}
            style={{
                padding: '4px 14px',
                fontSize: 13,
                borderRadius: 99,
                border: `1px solid ${config.border}`,
                background: config.bg,
                color: config.color,
                cursor: config.cursor,
                transition: 'all 0.2s ease',
                fontWeight: 500,
                marginTop: 10,
                width: '100%',
            }}
        >
            {config.label}
        </button>
    )
}