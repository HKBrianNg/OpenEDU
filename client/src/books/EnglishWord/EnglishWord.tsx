import { useEffect, useState, useRef, useCallback } from 'react'
import type { IndexData, WordItem } from './types'
import { getCourseBaseUrl, getCourseImageUrl } from '../../utils/coursePath'
import { useLocale } from '../../store/LocaleContext'

const COURSE_ID = 'EnglishWord'

const supportsTTS = typeof window !== 'undefined' && 'speechSynthesis' in window

function getImageName(en?: string) {
    return (
        en
            ?.trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '') + '.jpg'
    )
}

function getWordImageSrc(item: WordItem) {
    const imageName = item.url?.trim()
        ? item.url
        : item.en
          ? getImageName(item.en)
          : undefined

    return getCourseImageUrl(COURSE_ID, imageName)
}

function getGradeLabel(t: (k: string) => string, name?: string) {
    if (!name) return name || ''
    const map: Record<string, string> = {
        '幼稚园': 'englishword.grade.kindergarten',
        '小学3年级': 'englishword.grade.primary3',
        '小学4年级': 'englishword.grade.primary4',
        '小学5年级': 'englishword.grade.primary5',
        '小学6年级': 'englishword.grade.primary6',
        '中学1年级': 'englishword.grade.secondary1',
    }
    const key = map[name]
    return key ? t(key) : name
}

function getGroupLabel(t: (k: string) => string, group?: string) {
    if (!group) return group || ''
    const map: Record<string, string> = {
        '颜色': 'englishword.group.color',
        '动物': 'englishword.group.animal',
        '水果': 'englishword.group.fruit',
        '蔬菜': 'englishword.group.vegetable',
        '数字': 'englishword.group.number',
        '身体': 'englishword.group.body',
        '身体部位': 'englishword.group.bodyParts',
        '家庭': 'englishword.group.family',
        '家庭成员': 'englishword.group.familyMembers',
        '食物': 'englishword.group.food',
        '衣服': 'englishword.group.clothes',
        '服饰': 'englishword.group.clothing',
        '学校': 'englishword.group.school',
        '天气': 'englishword.group.weather',
        '交通': 'englishword.group.transport',
        '交通工具': 'englishword.group.vehicles',
        '形状': 'englishword.group.shape',
        '颜色与形状': 'englishword.group.colorAndShape',
        '人物': 'englishword.group.people',
        '礼貌用语': 'englishword.group.politeExpressions',
        '饮品主食': 'englishword.group.drinksStaples',
        '农场动物': 'englishword.group.farmAnimals',
        '野生动物': 'englishword.group.wildAnimals',
        '家居家具': 'englishword.group.homeFurniture',
        '天象天气': 'englishword.group.weatherPhenomena',
        '时间时段': 'englishword.group.timePeriods',
        '玩具': 'englishword.group.toys',
        '游乐设施': 'englishword.group.playgroundFacilities',
        '家居用品': 'englishword.group.householdItems',
        '洗护用品': 'englishword.group.toiletries',
        '校园场所': 'englishword.group.schoolPlaces',
        '校园人物': 'englishword.group.schoolPeople',
        '文具': 'englishword.group.stationery',
        '校园家具': 'englishword.group.schoolFurniture',
        '教具': 'englishword.group.teachingAids',
        '自然景物': 'englishword.group.naturalScenery',
        '四季': 'englishword.group.seasons',
        '月份': 'englishword.group.months',
        '星期': 'englishword.group.weekdays',
        '动作动词': 'englishword.group.actionVerbs',
        '方位介词': 'englishword.group.positionPrepositions',
        '情绪形容词': 'englishword.group.emotionAdjectives',
        '职业': 'englishword.group.jobs',
        '节日场景': 'englishword.group.festivalScenes',
        '生活场所': 'englishword.group.livingPlaces',
    }
    const key = map[group]
    return key ? t(key) : group
}

export default function EnglishWord() {
    const { locale, t } = useLocale()

    const [indexData, setIndexData] = useState<IndexData | null>(null)
    const [currentChapter, setCurrentChapter] = useState<string | null>(null)
    const [words, setWords] = useState<WordItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [speakingId, setSpeakingId] = useState<string | null>(null)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

    const stopSpeaking = useCallback(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel()
        }
        setSpeakingId(null)
        utteranceRef.current = null
    }, [])

    const speak = useCallback((text: string, lang: string, id: string) => {
        if (!supportsTTS) {
            return
        }

        if (speakingId === id) {
            stopSpeaking()
            return
        }

        if (speakingId) {
            window.speechSynthesis.cancel()
        }

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = lang
        utterance.rate = 0.9
        utterance.pitch = 1

        utterance.onend = () => {
            setSpeakingId(null)
            utteranceRef.current = null
        }

        utterance.onerror = () => {
            setSpeakingId(null)
            utteranceRef.current = null
        }

        utteranceRef.current = utterance
        setSpeakingId(id)
        window.speechSynthesis.speak(utterance)
    }, [speakingId, stopSpeaking])

    useEffect(() => {
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    function loadChapter(contentLink: string) {
        setLoading(true)
        setError(null)
        setCurrentChapter(contentLink)

        const baseUrl = getCourseBaseUrl(COURSE_ID)

        fetch(`${baseUrl}/${contentLink}`)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to load ${contentLink}`)
                return res.json()
            })
            .then((data: WordItem[]) => setWords(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        const baseUrl = getCourseBaseUrl(COURSE_ID)

        fetch(`${baseUrl}/data.json`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load index')
                return res.json()
            })
            .then((data: IndexData) => {
                setIndexData(data)
                if (data.chapters?.length > 0) {
                    loadChapter(data.chapters[0].contentLink)
                }
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [])

    if (loading && !indexData) return <div>{t('englishword.loading')}</div>
    if (error) return <div>{t('englishword.error')}: {error}</div>
    if (!indexData) return <div>{t('englishword.noData')}</div>

    const currentChapterInfo = indexData.chapters.find(
        c => c.contentLink === currentChapter
    )

    // 按 group 分组
    const groupedWords: Record<string, WordItem[]> = {}
    const ungrouped: WordItem[] = []

    words.forEach(item => {
        if (item.group) {
            if (!groupedWords[item.group]) {
                groupedWords[item.group] = []
            }
            groupedWords[item.group].push(item)
        } else {
            ungrouped.push(item)
        }
    })

    const groupKeys = Object.keys(groupedWords)

    function renderWordCard(item: WordItem, prefix: string, index: number) {
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
                            height: 160,
                            objectFit: 'cover',
                            borderRadius: 8,
                            marginBottom: 12,
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
                            speak(item.en || item.name || '', 'en-US', wordEnId)
                        }
                        style={{
                            fontSize: 18,
                            fontWeight: 630,
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
                            speak(item.en_sentense || '', 'en-US', sentenceEnId)
                        }
                        style={{
                            fontSize: 14,
                            color: speakingId === sentenceEnId ? '#1976d2' : '#444',
                            marginTop: 8,
                            lineHeight: 1.58,
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
                            speak(item.zh_sentense || '', 'zh-CN', sentenceZhId)
                        }
                        style={{
                            fontSize: 14,
                            color: speakingId === sentenceZhId ? '#d46b08' : '#666',
                            marginTop: 6,
                            lineHeight: 1.54,
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

    return (
        <div>
            {/* 固定按钮区域 */}
            <div style={{
                position: 'fixed',
                top: 75,
                left: 45,
                right: 49,
                zIndex: 103,
                backgroundColor: '#ffffff',
                padding: '14px 28px',
                borderBottom: '1px solid #dfdfdf',
                boxShadow: '0 2px 10px rgba(0,0,0,0.042)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 10,
            }}>
                {indexData.chapters.map(chapter => (
                    <button
                        key={chapter.contentLink}
                        onClick={() => loadChapter(chapter.contentLink)}
                        style={{
                            padding: '10px 22px',
                            fontWeight:
                                currentChapter === chapter.contentLink
                                    ? 730
                                    : 530,
                            backgroundColor:
                                currentChapter === chapter.contentLink
                                    ? '#1976d2'
                                    : '#f2f2f2',
                            color:
                                currentChapter === chapter.contentLink
                                    ? '#fff'
                                    : '#222',
                            border: '1px solid',
                            borderColor:
                                currentChapter === chapter.contentLink
                                    ? '#1976d2'
                                    : '#ccc',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 16,
                        }}
                    >
                        {getGradeLabel(t, chapter.name)}
                    </button>
                ))}
            </div>

            {/* 占位，防止固定按钮遮挡内容 */}
            <div style={{ height: 81 }} />

            {currentChapterInfo && (
                <h2 style={{ marginBottom: 33, fontSize: 21, fontWeight: 615 }}>
                    {locale === 'zh'
                        ? getGradeLabel(t, currentChapterInfo.name)
                        : (currentChapterInfo.en || getGradeLabel(t, currentChapterInfo.name))}
                </h2>
            )}

            {loading && <div style={{ padding: '16px 0' }}>{t('englishword.loadingWords')}</div>}
            {!loading && words.length === 0 && <div style={{ padding: '16px 0' }}>{t('englishword.noWords')}</div>}

            {/* 有 group 的分组 */}
            {groupKeys.map(groupName => (
                <div key={groupName} style={{ marginBottom: 37 }}>
                    <h3 style={{
                        fontSize: 19,
                        fontWeight: 680,
                        color: '#383838',
                        borderBottom: '2px solid #dbdbdb',
                        paddingBottom: 12,
                        marginBottom: 20,
                    }}>
                        {getGroupLabel(t, groupName)}
                    </h3>

                    <ul
                        style={{
                            listStyle: 'none',
                            padding: 0,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))',
                            gap: 24,
                        }}
                    >
                        {groupedWords[groupName].map((item, idx) =>
                            renderWordCard(item, groupName, idx)
                        )}
                    </ul>
                </div>
            ))}

            {/* 没有 group 的词 */}
            {ungrouped.length > 0 && (
                <div style={{ marginBottom: 43 }}>
                    <h3 style={{
                        fontSize: 19,
                        fontWeight: 655,
                        color: '#383838',
                        borderBottom: '2px solid #dbdbdb',
                        paddingBottom: 12,
                        marginBottom: 20,
                    }}>
                        {t('englishword.uncategorized')}
                    </h3>

                    <ul
                        style={{
                            listStyle: 'none',
                            padding: 0,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(282px, 1fr))',
                            gap: 24,
                        }}
                    >
                        {ungrouped.map((item, idx) =>
                            renderWordCard(item, 'ungrouped', idx)
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}