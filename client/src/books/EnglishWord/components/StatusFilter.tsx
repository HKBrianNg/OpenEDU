// client/src/books/EnglishWord/components/StatusFilter.tsx

import type { WordStatus } from '../hooks/useProgress'
import { useLocale } from '../../../store/LocaleContext'

export type StatusFilterValue = 'all' | WordStatus

interface StatusFilterProps {
    value: StatusFilterValue
    counts: Record<StatusFilterValue, number>
    onChange: (value: StatusFilterValue) => void
}

interface FilterOption {
    key: StatusFilterValue
    label: string
    bg: string
    border: string
    color: string
}

export default function StatusFilter({ value, counts, onChange }: StatusFilterProps) {
    const { t } = useLocale()

    const options: FilterOption[] = [
        {
            key: 'all',
            label: t('englishword.filterAll') || '全部',
            bg: '#f0f0f0',
            border: '#bfbfbf',
            color: '#333',
        },
        {
            key: 'pending',
            label: t('englishword.statusPending') || '待学习',
            bg: '#fff',
            border: '#d0d0d0',
            color: '#333',
        },
        {
            key: 'learning',
            label: t('englishword.statusLearning') || '学习中',
            bg: '#e6f4ff',
            border: '#91caff',
            color: '#0958d9',
        },
        {
            key: 'mastered',
            label: t('englishword.statusMastered') || '已掌握',
            bg: '#f6ffed',
            border: '#b7eb8f',
            color: '#389e0d',
        },
    ]

    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {options.map(opt => {
                const active = value === opt.key
                return (
                    <button
                        key={opt.key}
                        onClick={() => onChange(opt.key)}
                        style={{
                            padding: '6px 14px',
                            fontSize: 13,
                            borderRadius: 99,
                            border: `1px solid ${active ? opt.border : '#e0e0e0'}`,
                            background: active ? opt.bg : '#fff',
                            color: active ? opt.color : '#888',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: active ? 600 : 400,
                        }}
                    >
                        {opt.label} ({counts[opt.key] ?? 0})
                    </button>
                )
            })}
        </div>
    )
}
