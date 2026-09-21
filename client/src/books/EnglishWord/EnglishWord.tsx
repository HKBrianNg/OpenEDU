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
        '场所': 'englishword.group.place',
        '教室物品': 'englishword.group.classroomItems',
        '饮品': 'englishword.group.beverages',
        '家居物品': 'englishword.group.homeItems',
        '形容词': 'englishword.group.adjective',
        '介词': 'englishword.group.preposition',
        '天象': 'englishword.group.heavenlyPhenomena',
        '时间': 'englishword.group.time',
        '物品': 'englishword.group.object',
        '应答词': 'englishword.group.responseWords',
        '系动词': 'englishword.group.linkingVerb',
        '动词': 'englishword.group.verb',
        '名词': 'englishword.group.noun',
        '集合名词': 'englishword.group.collectiveNoun',
        '房间部件': 'englishword.group.roomParts',
        '电器': 'englishword.group.electricalAppliance',
        '日用品': 'englishword.group.dailyNecessities',
        '运动器材': 'englishword.group.sportsEquipment',
        '收藏品': 'englishword.group.collectible',
        '个人描述': 'englishword.group.personalDescription',
        '日常活动': 'englishword.group.dailyActivities',
        '植物部位': 'englishword.group.plantParts',
        '昆虫': 'englishword.group.insect',
        '鸟类': 'englishword.group.bird',
        '水生动物': 'englishword.group.aquaticAnimal',
        '陆生小动物': 'englishword.group.landSmallAnimal',
        '坚果': 'englishword.group.nut',
        '果蔬': 'englishword.group.fruitVegetable',
        '肉类': 'englishword.group.meat',
        '水产食材': 'englishword.group.seafoodIngredient',
        '乳制品': 'englishword.group.dairyProduct',
        '甜调味料': 'englishword.group.sweetSeasoning',
        '调味品': 'englishword.group.condiment',
        '厨房用品': 'englishword.group.kitchenUtensil',
        '厨房电器': 'englishword.group.kitchenAppliance',
        '卧室家具': 'englishword.group.bedroomFurniture',
        '卧室用品': 'englishword.group.bedroomSupplies',
        '家居软装': 'englishword.group.homeSoftDecoration',
        '配饰': 'englishword.group.accessory',
        '箱包': 'englishword.group.bagLuggage',
        '道路设施': 'englishword.group.roadFacility',
        '公共场所': 'englishword.group.publicPlace',
        '商铺': 'englishword.group.shopStore',
        '美术工具': 'englishword.group.artTool',
        '教学工具': 'englishword.group.teachingTool',
        '书本': 'englishword.group.book',
        '读物': 'englishword.group.readingMaterial',
        '学校设施': 'englishword.group.schoolFacility',
        '体育器材': 'englishword.group.sportsGear',
        '体育配饰': 'englishword.group.sportsAccessory',
        '超级角色': 'englishword.group.superCharacter',
        '副词': 'englishword.group.adverb',
        '方位副词': 'englishword.group.adverbOfPlace',
        '连接副词': 'englishword.group.conjunctiveAdverb',
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
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

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
        utterance.rate = 0.88
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
        setCollapsedGroups(new Set())

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

    const allGroupNames = [
        ...groupKeys,
        ...(ungrouped.length > 0 ? ['__ungrouped__'] : []),
    ]

    const toggleGroup = (name: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev)
            if (next.has(name)) {
                next.delete(name)
            } else {
                next.add(name)
            }
            return next
        })
    }

    const expandAll = () => setCollapsedGroups(new Set())
    const collapseAll = () => setCollapsedGroups(new Set(allGroupNames))

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
                            speak(item.en || item.name || '', 'en-US', wordEnId)
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
                            speak(item.en_sentense || '', 'en-US', sentenceEnId)
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
                            speak(item.zh_sentense || '', 'zh-CN', sentenceZhId)
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

    function renderGroupSection(groupName: string, items: WordItem[], prefix: string) {
        const isCollapsed = collapsedGroups.has(groupName)
        const label = groupName === '__ungrouped__'
            ? t('englishword.uncategorized')
            : getGroupLabel(t, groupName)

        return (
            <div key={groupName} style={{ margin: '0 22px 35px' }}>
                <div
                    onClick={() => toggleGroup(groupName)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '2px solid #dadada',
                        paddingBottom: 11,
                        marginBottom: isCollapsed ? 0 : 18,
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
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.28s ease',
                    }}>
                        ▼
                    </span>
                </div>

                {!isCollapsed && (
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
                        {items.map((item, idx) =>
                            renderWordCard(item, `${prefix}-${groupName}`, idx)
                        )}
                    </ul>
                )}
            </div>
        )
    }

    const hasGroups = groupKeys.length > 0 || ungrouped.length > 0

    return (
        <div>
            {/* 年级选择器 - 响应式布局 */}
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
                {indexData.chapters.map(chapter => {
                    const active = currentChapter === chapter.contentLink
                    return (
                        <button
                            key={chapter.contentLink}
                            onClick={() => loadChapter(chapter.contentLink)}
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

            {currentChapterInfo && (
                <h2 style={{
                    margin: '0 22px 26px',
                    fontSize: 21,
                    fontWeight: 605,
                }}>
                    {locale === 'zh'
                        ? getGradeLabel(t, currentChapterInfo.name)
                        : (currentChapterInfo.en || getGradeLabel(t, currentChapterInfo.name))}
                </h2>
            )}

            {loading && <div style={{ padding: '16px 24px' }}>{t('englishword.loadingWords')}</div>}
            {!loading && words.length === 0 && <div style={{ padding: '16px 24px' }}>{t('englishword.noWords')}</div>}

            {/* 全部展开/全部折叠按钮 */}
            {hasGroups && !loading && words.length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: 10,
                    margin: '0 22px 20px',
                }}>
                    <button
                        onClick={expandAll}
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
                        onClick={collapseAll}
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
                </div>
            )}

            {/* 有 group 的分组 */}
            {groupKeys.map(groupName =>
                renderGroupSection(groupName, groupedWords[groupName], 'group')
            )}

            {/* 没有 group 的词 */}
            {ungrouped.length > 0 &&
                renderGroupSection('__ungrouped__', ungrouped, 'ungrouped')
            }
        </div>
    )
}