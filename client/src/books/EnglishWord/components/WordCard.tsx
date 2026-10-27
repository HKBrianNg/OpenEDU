// client/src/books/EnglishWord/components/WordCard.tsx

import type { WordItem } from '../types'
import type { WordStatus } from '../hooks/useProgress'
import { getWordImageSrc, getWordImageFullSrc } from '../utils/image'
import { useLocale } from '../../../store/LocaleContext'
import WordStatusButton from './WordStatusButton'

interface WordCardProps {
    item: WordItem
    prefix: string
    index: number
    speakingId: string | null
    onSpeak: (text: string, lang: string, id: string) => void
    progressLoaded: boolean
    status: WordStatus
    onToggleStatus: () => void
}

export default function WordCard({
    item,
    prefix,
    index,
    speakingId,
    onSpeak,
    progressLoaded,
    status,
    onToggleStatus,
}: WordCardProps) {
    const { t } = useLocale()
    const imageSrc = getWordImageSrc(item)
    const fullImageSrc = getWordImageFullSrc(item)
    const wordEnId = `${prefix}-${index}-en`
    const sentenceEnId = `${prefix}-${index}-sen-en`
    const sentenceZhId = `${prefix}-${index}-sen-zh`

    // 点击图片：在新标签页打开 Bing 图片搜索，搜索这张图片所属的词
    const searchQuery = (item.name || item.en || '').trim()
    const handleImageClick = () => {
        if (!searchQuery) return
        const url = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}&form=HDRSC2&first=1`
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    return (
        <li
            style={{
                border: '1px solid #e0e0e0',
                borderRadius: 10,
                padding: 14,
                backgroundColor: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {imageSrc && (
                <img
                    src={imageSrc}
                    alt={item.name || item.en || ''}
                    onClick={handleImageClick}
                    // 一个章节几百张图，全量并发会把 CDN 打爆、还经常超时。
                    // 只加载滚进视口的；decoding 异步，避免解码卡住主线程。
                    loading="lazy"
                    decoding="async"
                    style={{
                        width: '100%',
                        height: 148,
                        objectFit: 'cover',
                        borderRadius: 8,
                        marginBottom: 11,
                        cursor: searchQuery ? 'pointer' : 'default',
                    }}
                    title={t('englishword.searchImage')}
                    onError={e => {
                        // 缩略图没生成（新加的词还没跑 gen-thumbs）就退原图，
                        // 原图也没有才把这块藏掉。只回退一次，避免死循环。
                        const el = e.currentTarget as HTMLImageElement
                        if (fullImageSrc && !el.dataset.fellBack) {
                            el.dataset.fellBack = '1'
                            el.src = fullImageSrc
                            return
                        }
                        el.style.display = 'none'
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

            {/* 状态按钮 */}
            <WordStatusButton
                status={status}
                progressLoaded={progressLoaded}
                onClick={onToggleStatus}
            />
        </li>
    )
}