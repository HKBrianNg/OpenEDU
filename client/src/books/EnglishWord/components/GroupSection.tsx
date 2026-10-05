// client/src/books/EnglishWord/components/GroupSection.tsx

import type { WordItem } from '../types'
import type { WordStatus } from '../hooks/useProgress'
import { getGroupLabel } from '../utils/labels'
import { useLocale } from '../../../store/LocaleContext'
import WordCard from './WordCard'

interface GroupSectionProps {
    groupName: string
    items: WordItem[]
    prefix: string
    collapsed: boolean
    onToggle: (name: string) => void
    speakingId: string | null
    onSpeak: (text: string, lang: string, id: string) => void
    progressLoaded: boolean
    getWordStatus: (item: WordItem) => WordStatus
    onToggleWordStatus: (item: WordItem) => void
}

export default function GroupSection({
    groupName,
    items,
    prefix,
    collapsed,
    onToggle,
    speakingId,
    onSpeak,
    progressLoaded,
    getWordStatus,
    onToggleWordStatus,
}: GroupSectionProps) {
    const { t } = useLocale()
    const label = groupName === '__ungrouped__'
        ? t('englishword.uncategorized')
        : getGroupLabel(t, groupName)

    return (
        <div key={groupName} style={{ margin: '0 22px 35px' }}>
            <div
                onClick={() => onToggle(groupName)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderBottom: '2px solid #dadada',
                    paddingBottom: 11,
                    marginBottom: collapsed ? 0 : 18,
                    userSelect: 'none',
                }}
            >
                <h3 style={{
                    fontSize: 19,
                    fontWeight: 682,
                    color: '#383838',
                    margin: 0,
                }}>
                    {label}
                    <span style={{
                        fontSize: 14,
                        fontWeight: 410,
                        color: '#888',
                        marginLeft: 12,
                    }}>
                        ({items.length})
                    </span>
                </h3>
                <span style={{
                    fontSize: 18,
                    color: '#777',
                    transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.28s ease',
                }}>
                    ▼
                </span>
            </div>

            {!collapsed && (
                <ul
                    style={{
                        listStyle: 'none',
                        padding: 0,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(272px, 1fr))',
                        gap: 22,
                        margin: 0,
                    }}
                >
                    {items.map((item, idx) => (
                        <WordCard
                            key={`${prefix}-${groupName}-${idx}`}
                            item={item}
                            prefix={`${prefix}-${groupName}`}
                            index={idx}
                            speakingId={speakingId}
                            onSpeak={onSpeak}
                            progressLoaded={progressLoaded}
                            status={getWordStatus(item)}
                            onToggleStatus={() => onToggleWordStatus(item)}
                        />
                    ))}
                </ul>
            )}
        </div>
    )
}