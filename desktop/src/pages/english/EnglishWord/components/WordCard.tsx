// client/src/books/EnglishWord/components/WordCard.tsx

import type { WordItem } from '../types'
import type { WordStatus } from '../hooks/useProgress'
import { getWordImageSrc, getWordImageFullSrc } from '../utils/image'
import { useLocale } from '../../../../store/LocaleContext'
import { getCourseAssetUrl } from '../../../../utils/coursePath'
import { englishWordAudioPath } from '../../../../utils/voiceAssets'
import WordStatusButton from './WordStatusButton'

const COURSE_ID = 'EnglishWord'

interface WordCardProps {
    item: WordItem
    prefix: string
    index: number
    /** 章节音频子目录名（contentLink 去掉 .json），预生成 mp3 路径要用 */
    stem: string
    speakingId: string | null
    onSpeak: (text: string, lang: string, id: string, audioUrl?: string) => void
    progressLoaded: boolean
    status: WordStatus
    onToggleStatus: () => void
}

export default function WordCard({
    item,
    prefix,
    index,
    stem,
    speakingId,
    onSpeak,
    progressLoaded,
    status,
    onToggleStatus,
}: WordCardProps) {
    const { t } = useLocale()
    const imageSrc = getWordImageSrc(item)
    const fullImageSrc = getWordImageFullSrc(item)
    const wordZhId = `${prefix}-${index}-zh`
    const wordEnId = `${prefix}-${index}-en`
    const sentenceEnId = `${prefix}-${index}-sen-en`
    const sentenceZhId = `${prefix}-${index}-sen-zh`

    // 预生成音频（VoiceAdmin 产物，EnglishWord/.audio/<stem>/<slug>...mp3）：
    // mp3 优先，404 由 useSpeech 回退浏览器 TTS
    const audioUrl = (part: 'title' | 'content', lang: 'zh' | 'en'): string | undefined => {
        if (!stem || !item.audioSlug) return undefined
        return getCourseAssetUrl(
            COURSE_ID,
            englishWordAudioPath({ stem, slug: item.audioSlug, part, lang }),
        )
    }

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

            {/* 词条：点中文读中文、点英文读英文（各自播对应语言的预生成音频） */}
            {(item.en || item.name) && (
                <div
                    style={{
                        fontSize: 18,
                        fontWeight: 660,
                        marginBottom: 6,
                        transition: 'color 0.25s',
                    }}
                >
                    {item.name && (
                        <span
                            onClick={() =>
                                onSpeak(item.name || '', 'zh-CN', wordZhId, audioUrl('title', 'zh'))
                            }
                            style={{
                                cursor: 'pointer',
                                color: speakingId === wordZhId ? '#d46b08' : '#333',
                            }}
                            title={t('englishword.clickToReadZh')}
                        >
                            {item.name}
                            {speakingId === wordZhId && (
                                <span style={{ fontSize: 13, color: '#d46b08', marginLeft: 6 }}>
                                    🔊
                                </span>
                            )}
                        </span>
                    )}
                    {item.name && item.en && <span style={{ color: '#999' }}> / </span>}
                    {item.en && (
                        <span
                            onClick={() =>
                                onSpeak(item.en || '', 'en-US', wordEnId, audioUrl('title', 'en'))
                            }
                            style={{
                                cursor: 'pointer',
                                color: speakingId === wordEnId ? '#1976d2' : '#333',
                            }}
                            title={t('englishword.clickToReadEn')}
                        >
                            {item.en}
                            {speakingId === wordEnId && (
                                <span style={{ fontSize: 13, color: '#1976d2', marginLeft: 6 }}>
                                    🔊
                                </span>
                            )}
                        </span>
                    )}
                </div>
            )}

            {/* 英文句子 - 点击朗读英文 */}
            {item.en_sentense && (
                <div
                    onClick={() =>
                        onSpeak(item.en_sentense || '', 'en-US', sentenceEnId, audioUrl('content', 'en'))
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
                        onSpeak(item.zh_sentense || '', 'zh-CN', sentenceZhId, audioUrl('content', 'zh'))
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