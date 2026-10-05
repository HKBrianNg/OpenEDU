// client/src/books/EnglishWord/components/WordCard.tsx

import type { WordItem } from '../types'
import { getWordImageSrc } from '../utils/image'
import { useLocale } from '../../../store/LocaleContext'

interface WordCardProps {
    item: WordItem
    prefix: string
    index: number
    speakingId: string | null
    onSpeak: (text: string, lang: string, id: string) => void
}

export default function WordCard({ item, prefix, index, speakingId, onSpeak }: WordCardProps) {
    const { t } = useLocale()
    const imageSrc = getWordImageSrc(item)
    const wordEnId = `${prefix}-${index}-en`
    const sentenceEnId = `${prefix}-${index}-sen-en`
    const sentenceZhId = `${prefix}-${index}-sen-zh`

    return (
        <li
            key={`${prefix}-${index}`}
            style={{
                border: '1px solid #e0e0e0',
                borderRadius: 10,
                padding: 14,
                backgroundColor: '#fafafa',
            }}
        >
            {imageSrc && (
                <img
                    src={imageSrc}
                    alt={item.name || item.en || ''}
                    style={{
                        width: '100%',
                        height: 148,
                        objectFit: 'cover',
                        borderRadius: 8,
                        marginBottom: 11,
                    }}
                    onError={e => {
                        ;(
                            e.currentTarget as HTMLImageElement
                        ).style.display = 'none'
                    }}
                />
            )}

            {/* 英文单词 - 点击朗读英文 */}
            {(item.en || item.name) && (
                <div
                    onClick={() =>
                        onSpeak(item.en || item.name || '', 'en-US', wordEnId)
                    }
                    style={{
                        fontSize: 18,
                        fontWeight: 660,
                        marginBottom: 6,
                        cursor: 'pointer',
                        color: speakingId === wordEnId ? '#1976d2' : '#333',
                        transition: 'color 0.25s',
                    }}
                    title={t('englishword.clickToReadEn')}
                >
                    {item.name || item.en}
                    {item.en && item.name ? ` / ${item.en}` : ''}
                    {speakingId === wordEnId && (
                        <span style={{ fontSize: 13, color: '#1976d2', marginLeft: 10 }}>
                            🔊
                        </span>
                    )}
                </div>
            )}

            {/* 英文句子 - 点击朗读英文 */}
            {item.en_sentense && (
                <div
                    onClick={() =>
                        onSpeak(item.en_sentense || '', 'en-US', sentenceEnId)
                    }
                    style={{
                        fontSize: 14,
                        color: speakingId === sentenceEnId ? '#1976d2' : '#444',
                        marginTop: 8,
                        lineHeight: 1.55,
                        cursor: 'pointer',
                        transition: 'color 0.25s',
                    }}
                    title={t('englishword.clickToReadEn')}
                >
                    {item.en_sentense}
                    {speakingId === sentenceEnId && (
                        <span style={{ fontSize: 13, color: '#1976d2', marginLeft: 8 }}>
                            🔊
                        </span>
                    )}
                </div>
            )}

            {/* 中文句子 - 点击朗读中文 */}
            {item.zh_sentense && (
                <div
                    onClick={() =>
                        onSpeak(item.zh_sentense || '', 'zh-CN', sentenceZhId)
                    }
                    style={{
                        fontSize: 14,
                        color: speakingId === sentenceZhId ? '#d46b08' : '#666',
                        marginTop: 6,
                        lineHeight: 1.5,
                        cursor: 'pointer',
                        transition: 'color 0.23s',
                    }}
                    title={t('englishword.clickToReadZh')}
                >
                    {item.zh_sentense}
                    {speakingId === sentenceZhId && (
                        <span style={{ fontSize: 13, color: '#d46b08', marginLeft: 8 }}>
                            🔊
                        </span>
                    )}
                </div>
            )}
        </li>
    )
}