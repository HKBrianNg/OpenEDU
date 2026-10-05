// client/src/books/EnglishWord/EnglishWord.tsx

import { useEffect, useState } from 'react'
import type { IndexData, WordItem } from './types'
import { getCourseBaseUrl } from '../../utils/coursePath'
import { useLocale } from '../../store/LocaleContext'
import { useAuth } from '../../store/AuthContext'
import { useSpeech } from './hooks/useSpeech'
import { useProgress } from './hooks/useProgress'
import { getGradeLabel } from './utils/labels'
import BackButton from './components/BackButton'
import GradeSelector from './components/GradeSelector'
import ProgressButtons from './components/ProgressButtons'
import GroupSection from './components/GroupSection'
import LearnModal from './components/LearnModal'
import SpellingPractice from './components/SpellingPractice'
import QuizProgressModal from './components/QuizProgressModal'

const COURSE_ID = 'EnglishWord'

interface EnglishWordProps {
    onExit?: () => void
}

export default function EnglishWord({ onExit }: EnglishWordProps) {
    const { locale, t } = useLocale()
    const { user, token, isAuthenticated } = useAuth()
    const { speakingId, speak } = useSpeech()

    const [indexData, setIndexData] = useState<IndexData | null>(null)
    const [currentChapter, setCurrentChapter] = useState<string | null>(null)
    const [words, setWords] = useState<WordItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
    const [learnOpen, setLearnOpen] = useState(false)
    const [spellingOpen, setSpellingOpen] = useState(false)
    const [quizProgressOpen, setQuizProgressOpen] = useState(false)

    // 当前章节名（用于进度 API）
    const currentChapterName = indexData?.chapters.find(
        c => c.contentLink === currentChapter
    )?.name

    const {
        progressLoaded,
        syncing,
        downloadProgress,
        uploadProgress,
        toggleWordStatus,
        getWordStatus,
        loadFromLocal,
    } = useProgress({
        userId: user?.id,
        token,
        isAuthenticated,
        chapterName: currentChapterName,
    })

    // 挂载时读取本地缓存，避免每次进入页面都要重新下载
    useEffect(() => {
        loadFromLocal()
    }, [loadFromLocal])

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

    const hasGroups = groupKeys.length > 0 || ungrouped.length > 0

    // 只取 learning 状态的单词给教学组件
    const learningWords = words.filter(w => getWordStatus(w) === 'learning')

    // ActionBar 按钮样式
    const actionButtonStyle = {
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
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <BackButton onExit={onExit} />
                <ProgressButtons
                    isAuthenticated={isAuthenticated}
                    progressLoaded={progressLoaded}
                    syncing={syncing}
                    onDownload={downloadProgress}
                    onUpload={uploadProgress}
                />
            </div>

            <GradeSelector
                chapters={indexData.chapters}
                currentChapter={currentChapter}
                onSelect={loadChapter}
            />

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

            {hasGroups && !loading && words.length > 0 && (
                <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px', flexWrap: 'wrap' }}>
                    <button onClick={expandAll} style={actionButtonStyle}>
                        {t('englishword.expandAll') || '展开全部'}
                    </button>
                    <button onClick={collapseAll} style={actionButtonStyle}>
                        {t('englishword.collapseAll') || '折叠全部'}
                    </button>
                    <button onClick={() => setLearnOpen(true)} style={actionButtonStyle}>
                        {t('englishword.learnModal.title') || '词汇学习'}
                    </button>
                    <button onClick={() => setSpellingOpen(true)} style={actionButtonStyle}>
                        {t('englishword.spellingPractice.title') || '拼写练习'}
                    </button>
                    <button onClick={() => setQuizProgressOpen(true)} style={actionButtonStyle}>
                        {t('englishword.quizProgress') || '测验进度'}
                    </button>
                </div>
            )}

            {groupKeys.map(groupName =>
                <GroupSection
                    key={groupName}
                    groupName={groupName}
                    items={groupedWords[groupName]}
                    prefix="group"
                    collapsed={collapsedGroups.has(groupName)}
                    onToggle={toggleGroup}
                    speakingId={speakingId}
                    onSpeak={speak}
                    progressLoaded={progressLoaded}
                    getWordStatus={getWordStatus}
                    onToggleWordStatus={toggleWordStatus}
                />
            )}

            {ungrouped.length > 0 && (
                <GroupSection
                    groupName="__ungrouped__"
                    items={ungrouped}
                    prefix="ungrouped"
                    collapsed={collapsedGroups.has('__ungrouped__')}
                    onToggle={toggleGroup}
                    speakingId={speakingId}
                    onSpeak={speak}
                    progressLoaded={progressLoaded}
                    getWordStatus={getWordStatus}
                    onToggleWordStatus={toggleWordStatus}
                />
            )}

            <LearnModal
                words={learningWords}
                open={learnOpen}
                onClose={() => setLearnOpen(false)}
            />

            <SpellingPractice
                words={learningWords}
                open={spellingOpen}
                onClose={() => setSpellingOpen(false)}
            />

            <QuizProgressModal
                words={words}
                getWordStatus={getWordStatus}
                open={quizProgressOpen}
                onClose={() => setQuizProgressOpen(false)}
            />
        </div>
    )
}