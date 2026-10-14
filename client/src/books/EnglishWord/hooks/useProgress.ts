// client/src/books/EnglishWord/hooks/useProgress.ts

import { useState, useCallback } from 'react'
import type { WordItem } from '../types'
import { api } from '../../../utils/request'
import { storage, STORAGE_KEYS } from '../../../utils/storage'

export type WordStatus = 'pending' | 'learning' | 'mastered'

// 本地进度的持久化形态：同时记下「状态」「所属章节」和「中文释义」
// 这样即使还没上传到服务器，LearningResults 的本地兜底也能拿到完整的章节和中文
export interface LocalProgressEntry {
    status: WordStatus
    chapter: string
    zh?: string
}
export type LocalProgressMap = Record<string, LocalProgressEntry>

interface ProgressRecord {
    id?: string
    user_id?: string
    course_name?: string
    chapter_name?: string
    group_name?: string
    content_en: string
    content_zh?: string | null
    status: 'learning' | 'mastered'
    last_review_at?: string
    created_at?: string
    updated_at?: string
}

interface UseProgressOptions {
    userId?: string
    token?: string | null | undefined
    isAuthenticated: boolean
    chapterName?: string
}

export function useProgress({
    userId,
    token,
    isAuthenticated,
    chapterName,
}: UseProgressOptions) {
    const [localProgress, setLocalProgress] = useState<LocalProgressMap>({})
    const [progressLoaded, setProgressLoaded] = useState(false)
    const [syncing, setSyncing] = useState(false)

    // 内部兜底 token
    const authToken = token ?? undefined

    // 生成单词唯一 key
    const getWordKey = useCallback((item: WordItem) => {
        const en = item.en || item.name || ''
        const group = item.group || ''
        return `${group}|${en}`
    }, [])

    // 保存到本地存储
    const saveToLocal = useCallback((progress: LocalProgressMap) => {
        storage.set(STORAGE_KEYS.englishwordProgress, progress)
    }, [])

    // 从本地存储读取进度（storage.get 自带解析防护）
    // 兼容旧格式：旧版 value 是 status 字符串，新版是 { status, chapter }
    const loadFromLocal = useCallback(() => {
        const saved = storage.get<Record<string, any>>(STORAGE_KEYS.englishwordProgress)
        if (saved) {
            const normalized: LocalProgressMap = {}
            let needsResave = false
            Object.entries(saved).forEach(([key, val]) => {
                if (val && typeof val === 'object' && 'status' in val) {
                    normalized[key] = { status: val.status, chapter: val.chapter || '', zh: val.zh || '' }
                } else if (typeof val === 'string') {
                    normalized[key] = { status: val as WordStatus, chapter: '' }
                    needsResave = true
                }
            })
            setLocalProgress(normalized)
            setProgressLoaded(true)
            if (needsResave) saveToLocal(normalized)
        }
    }, [saveToLocal])

    // 下载进度（从服务器拉取）
    const downloadProgress = useCallback(async () => {
        if (!isAuthenticated || !userId || !authToken) return

        setSyncing(true)
        try {
            const res = await api.get(`/api/progress?userId=${userId}`)
            const data = res.data
            if (data.success) {
                const progress: LocalProgressMap = {}
                data.data.forEach((record: ProgressRecord) => {
                    // 服务器返回 snake_case 字段：group_name, content_en
                    const key = `${record.group_name || ''}|${record.content_en}`
                    progress[key] = {
                        status: record.status,
                        chapter: record.chapter_name || '',
                        zh: record.content_zh || '',
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
            const upsertRecords: any[] = []
            // 需要删除的（pending，说明改回未学）
            const deleteRecords: { groupName: string; contentEn: string; chapterName: string }[] = []

            Object.entries(localProgress).forEach(([key, entry]) => {
                const [groupName, contentEn] = key.split('|')
                // 使用单词自己的章节（不再被当前章节覆盖）
                const wordChapter = entry.chapter || chapterName || ''

                if (entry.status === 'pending') {
                    // pending = 没有进度，需要删除服务器上的记录
                    deleteRecords.push({ groupName, contentEn, chapterName: wordChapter })
                } else if (entry.status === 'learning' || entry.status === 'mastered') {
                    // learning / mastered = 需要新增或更新
                    upsertRecords.push({
                        userId: userId,             // camelCase
                        courseName: 'EnglishWord',  // camelCase
                        chapterName: wordChapter,   // camelCase（按单词各自的章节）
                        groupName: groupName,       // camelCase
                        contentEn: contentEn,       // camelCase
                        contentZh: entry.zh || null, // camelCase（带中文释义）
                        status: entry.status,
                    })
                }
            })

            // 1. 先处理新增/更新（POST）
            for (const record of upsertRecords) {
                console.log('POST 上传:', JSON.stringify(record))
                const res = await api.post('/api/progress', record)
                if (!res.ok) {
                    console.error('POST 上传失败:', res.status, res.data, '请求体:', record)
                }
            }

            // 2. 再处理删除（DELETE）
            for (const record of deleteRecords) {
                console.log('DELETE 删除:', JSON.stringify(record))
                const res = await api.delete(`/api/progress?userId=${userId}`, {
                    chapterName: record.chapterName, // camelCase（按单词各自的章节）
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
    }, [isAuthenticated, userId, authToken, chapterName, localProgress])

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
                },
            }
            saveToLocal(updated)
            return updated
        })
    }, [getWordKey, saveToLocal, chapterName])

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
                },
            }
            saveToLocal(updated)
            return updated
        })
    }, [getWordKey, saveToLocal, chapterName])

    // 获取单词状态
    const getWordStatus = useCallback((item: WordItem): WordStatus => {
        if (!progressLoaded) return 'pending'
        const key = getWordKey(item)
        return localProgress[key]?.status || 'pending'
    }, [progressLoaded, localProgress, getWordKey])

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