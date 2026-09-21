import { useEffect, useState } from 'react'
import type { IndexData, WordItem } from './types'
import { getCourseBaseUrl, getCourseImageUrl } from '../../utils/coursePath'

const COURSE_ID = 'EnglishWord'

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

export default function EnglishWord() {
    const [indexData, setIndexData] = useState<IndexData | null>(null)
    const [currentChapter, setCurrentChapter] = useState<string | null>(null)
    const [words, setWords] = useState<WordItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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

    if (loading && !indexData) return <div>Loading...</div>
    if (error) return <div>Error: {error}</div>
    if (!indexData) return <div>No data</div>

    const currentChapterInfo = indexData.chapters.find(
        c => c.contentLink === currentChapter
    )

    return (
        <div>
            <h1>{indexData.title}</h1>
            <p>{indexData.titleEn}</p>

            <div style={{ marginBottom: 24 }}>
                {indexData.chapters.map(chapter => (
                    <button
                        key={chapter.contentLink}
                        onClick={() => loadChapter(chapter.contentLink)}
                        style={{
                            marginRight: 10,
                            marginBottom: 8,
                            padding: '8px 18px',
                            fontWeight:
                                currentChapter === chapter.contentLink
                                    ? 'bold'
                                    : 'normal',
                            backgroundColor:
                                currentChapter === chapter.contentLink
                                    ? '#1976d2'
                                    : '#f5f5f5',
                            color:
                                currentChapter === chapter.contentLink
                                    ? '#fff'
                                    : '#333',
                            border: '1px solid',
                            borderColor:
                                currentChapter === chapter.contentLink
                                    ? '#1976d2'
                                    : '#ddd',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 15,
                        }}
                    >
                        {chapter.name}
                    </button>
                ))}
            </div>

            {currentChapterInfo && (
                <h2 style={{ marginBottom: 20 }}>
                    {currentChapterInfo.name} ({currentChapterInfo.en})
                </h2>
            )}

            {loading && <div>Loading words...</div>}
            {!loading && words.length === 0 && <div>No words found</div>}

            <ul
                style={{
                    listStyle: 'none',
                    padding: 0,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 20,
                }}
            >
                {words.map((item, index) => {
                    const imageSrc = getWordImageSrc(item)

                    return (
                        <li
                            key={index}
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
                                        height: 140,
                                        objectFit: 'cover',
                                        borderRadius: 8,
                                        marginBottom: 10,
                                    }}
                                    onError={e => {
                                        ;(
                                            e.currentTarget as HTMLImageElement
                                        ).style.display = 'none'
                                    }}
                                />
                            )}

                            <div
                                style={{
                                    fontSize: 17,
                                    fontWeight: 600,
                                    marginBottom: 4,
                                }}
                            >
                                {item.name || item.en}
                                {item.en && item.name
                                    ? ` / ${item.en}`
                                    : ''}
                            </div>

                            {item.en_sentense && (
                                <div
                                    style={{
                                        fontSize: 14,
                                        color: '#444',
                                        marginTop: 6,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {item.en_sentense}
                                </div>
                            )}
                            {item.zh_sentense && (
                                <div
                                    style={{
                                        fontSize: 14,
                                        color: '#777',
                                        marginTop: 4,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {item.zh_sentense}
                                </div>
                            )}
                            {item.group && (
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: '#aaa',
                                        marginTop: 8,
                                        fontStyle: 'italic',
                                    }}
                                >
                                    {item.group}
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}