// client/src/books/EnglishWord/components/GradeSelector.tsx

import type { Chapter } from '../types'
import { getGradeLabel } from '../utils/labels'
import { useLocale } from '../../../store/LocaleContext'

interface GradeSelectorProps {
    chapters: Chapter[]
    currentChapter: string | null
    onSelect: (contentLink: string) => void
}

export default function GradeSelector({ chapters, currentChapter, onSelect }: GradeSelectorProps) {
    const { t } = useLocale()

    return (
        <div
            style={{
                margin: '16px 18px 22px',
                background: '#fafbfc',
                border: '1px solid #eaeaea',
                borderRadius: 14,
                padding: '12px 14px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
            }}
        >
            {chapters.map(chapter => {
                const active = currentChapter === chapter.contentLink
                return (
                    <button
                        key={chapter.contentLink}
                        onClick={() => onSelect(chapter.contentLink)}
                        style={{
                            padding: '9px 20px',
                            fontSize: 15,
                            fontWeight: active ? 720 : 480,
                            borderRadius: 99,
                            border: '1px solid',
                            borderColor: active ? '#1976d2' : '#cfcfcf',
                            background: active ? '#1976d2' : '#f4f6f8',
                            color: active ? '#fff' : '#333',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {getGradeLabel(t, chapter.name)}
                    </button>
                )
            })}
        </div>
    )
}