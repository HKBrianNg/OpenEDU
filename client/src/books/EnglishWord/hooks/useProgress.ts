// client/src/books/EnglishWord/hooks/useProgress.ts

import { useState, useCallback } from 'react'
import type { WordItem } from '../types'
import { api } from '../../../utils/request'
import { storage, STORAGE_KEYS } from '../../../utils/storage'
import {
    DEFAULT_COURSE,
    normalizeProgressMap,
    type LocalProgressMap,
    type WordStatus,
} from '../progressStorage'

// 类型 re-export：保留旧 import 路径，避免一次性改全部调用方
export type { LocalProgressEntry, LocalProgressMap, WordStatus } from '../progressStorage'
export { isWordStatus } from '../progressStorage'

interface ProgressRecord {
    id?: string
    user_id?: string
    course_name?: string | null
    chapter_name?: string | null
    group_name?: string | null
    content_en: string
    content_zh?: string | null
    status: 'learning' | 'mastered'
    last_review_at?: string
    created_at?: string
    updated_at?: string
}

interface UpsertPayload {
    userId: string
    courseName: string
    chapterName: string
    groupName: string
    contentEn: string
    contentZh: string | null
    status: WordStatus
}

interface DeletePayload {
    courseName: string
    chapterName: string
    groupName: string
    contentEn: string
}

interface UseProgressOptions {
    userId?: string
    token?: string | null | undefined
    isAuthenticated: boolean
    chapterName?: string
    /** 所属课程标识；不传默认 EnglishWord（保兼容） */
    course?: string
    /**
     * 自定义 key 派生函数；不传则用默认 `${group}|${en}`。
     * BasicEnglish300 这类没有 group 字段但需要把章节纳入 key 的课程可定制。
     */
    getKey?: (item: WordItem) => string
}

export function useProgress({
    userId,
    token,
    isAuthenticated,
    chapterName,
    course = DEFAULT_COURSE,
    getKey: customGetKey,
}: UseProgressOptions) {
    const [localProgress, setLocalProgress] = useState<LocalProgressMap>({})
    const [progressLoaded, setProgressLoaded] = useState(false)
    const [syncing, setSyncing] = useState(false)

    // 内部兜底 token
    const authToken = token ?? undefined

    // 生成单词唯一 key（同一课程内 group|en 已足够；不同课程由 entry.course 区分）
    // 可被 customGetKey 覆盖：例如 BasicEnglish300 用 `chapter|en`
    const getWordKey = useCallback((item: WordItem) => {
        if (customGetKey) return customGetKey(item)
        const en = item.en || item.name || ''
        const group = item.group || ''
        return `${group}|${en}`
    }, [customGetKey])

    // 保存到本地存储
    const saveToLocal = useCallback((progress: LocalProgressMap) => {
        storage.set(STORAGE_KEYS.englishwordProgress, progress)
    }, [])

    // 从本地存储读取进度，并归一化到当前 LocalProgressMap 形态
    // 兼容旧格式（v1 字符串、v2 缺 zh 字段、坏值）—— normalizeProgressMap 负责
    const loadFromLocal = useCallback(() => {
        const raw = storage.get<unknown>(STORAGE_KEYS.englishwordProgress)
        const { map, changed } = normalizeProgressMap(raw)
        setLocalProgress(map)
        setProgressLoaded(true)
        if (changed) saveToLocal(map)
    }, [saveToLocal])

    // 下载进度（从服务器拉取：返回该用户所有课程，合并到本地表）
    const downloadProgress = useCallback(async () => {
        if (!isAuthenticated || !userId || !authToken) return

        setSyncing(true)
        try {
            const res = await api.get(`/api/progress?userId=${userId}`)
            const data = res.data
            if (data.success) {
                const progress: LocalProgressMap = {}
                data.data.forEach((record: ProgressRecord) => {
                    // 服务器返回 snake_case 字段：course_name, group_name, content_en
                    const key = `${record.group_name || ''}|${record.content_en}`
                    progress[key] = {
                        status: record.status,
                        chapter: record.chapter_name || '',
                        zh: record.content_zh || '',
                        course: record.course_name || DEFAULT_COURSE,
                    }
                })
                setLocalProgress(progress)
                saveToLocal(progress)
                setProgressLoaded(true)
            }
        } catch {
            // 网络错误，忽略
        } finally {
            setSyncing(false)
        }
    }, [isAuthenticated, userId, authToken, saveToLocal])

    // 上传进度（保存到服务器）
    const uploadProgress = useCallback(async () => {
        if (!isAuthenticated || !userId || !authToken) return

        setSyncing(true)
        try {
            // 需要上传的（learning / mastered）
            const upsertRecords: UpsertPayload[] = []
            // 需要删除的（pending，说明改回未学）
            const deleteRecords: DeletePayload[] = []

            Object.entries(localProgress).forEach(([key, entry]) => {
                const [groupName, contentEn] = key.split('|')
                // 使用 entry 自己的课程/章节（不再被当前上下文覆盖）
                const wordCourse = entry.course || course
                const wordChapter = entry.chapter || chapterName || ''

                if (entry.status === 'pending') {
                    // pending = 没有进度，需要删除服务器上的记录
                    deleteRecords.push({
                        courseName: wordCourse,
                        groupName,
                        contentEn,
                        chapterName: wordChapter,
                    })
                } else if (entry.status === 'learning' || entry.status === 'mastered') {
                    // learning / mastered = 需要新增或更新
                    upsertRecords.push({
                        userId: userId,             // camelCase
                        courseName: wordCourse,     // camelCase（按 entry 自己的课程）
                        chapterName: wordChapter,   // camelCase（按 entry 自己的章节）
                        groupName: groupName,       // camelCase
                        contentEn: contentEn,       // camelCase
                        contentZh: entry.zh || null, // camelCase（带中文释义）
                        status: entry.status,
                    })
                }
            })

            // 1. 先处理新增/更新（POST）
            for (const record of upsertRecords) {
                const res = await api.post('/api/progress', record)
                if (!res.ok) {
                    console.error('POST 上传失败:', res.status, res.data, '请求体:', record)
                }
            }

            // 2. 再处理删除（DELETE）
            for (const record of deleteRecords) {
                const res = await api.delete(`/api/progress?userId=${userId}`, {
                    courseName: record.courseName, // camelCase（按 entry 自己的课程）
                    chapterName: record.chapterName, // camelCase（按 entry 自己的章节）
                    groupName: record.groupName,     // camelCase
                    contentEn: record.contentEn,     // camelCase
                })
                if (!res.ok) {
                    console.error('DELETE 删除失败:', res.status, res.data, '请求体:', record)
                }
            }
        } catch (e) {
            console.error('上传异常:', e)
        } finally {
            setSyncing(false)
        }
    }, [isAuthenticated, userId, authToken, course, chapterName, localProgress])

    // 切换单词状态（仅本地）
    const toggleWordStatus = useCallback((item: WordItem) => {
        const key = getWordKey(item)
        setLocalProgress(prev => {
            const current = prev[key]?.status || 'pending'
            let next: WordStatus
            if (current === 'pending') {
                next = 'learning'
            } else if (current === 'learning') {
                next = 'pending'
            } else {
                return prev // mastered 不可点击
            }
            const updated: LocalProgressMap = {
                ...prev,
                [key]: {
                    status: next,
                    chapter: chapterName || prev[key]?.chapter || '',
                    zh: item.name || prev[key]?.zh || '',
                    course: prev[key]?.course || course,
                },
            }
            saveToLocal(updated)
            return updated
        })
    }, [getWordKey, saveToLocal, chapterName, course])

    // 直接设置单词状态（用于测验上传结果）
    const setWordStatus = useCallback((item: WordItem, status: WordStatus) => {
        const key = getWordKey(item)
        setLocalProgress(prev => {
            const updated: LocalProgressMap = {
                ...prev,
                [key]: {
                    status,
                    chapter: chapterName || prev[key]?.chapter || '',
                    zh: item.name || prev[key]?.zh || '',
                    course: prev[key]?.course || course,
                },
            }
            saveToLocal(updated)
            return updated
        })
    }, [getWordKey, saveToLocal, chapterName, course])

    // 获取单词状态
    // 注意：localProgress 表是全课程的合集，这里按 course 过滤后取值
    const getWordStatus = useCallback((item: WordItem): WordStatus => {
        if (!progressLoaded) return 'pending'
        const key = getWordKey(item)
        const entry = localProgress[key]
        if (entry && entry.course && entry.course !== course) {
            return 'pending' // 不属于当前课程的记录，视为未学
        }
        return entry?.status || 'pending'
    }, [progressLoaded, localProgress, getWordKey, course])

    return {
        localProgress,
        progressLoaded,
        syncing,
        loadFromLocal,
        downloadProgress,
        uploadProgress,
        toggleWordStatus,
        setWordStatus,
        getWordStatus,
    }
}
