// client/src/books/EnglishWord/hooks/useProgress.ts

import { useState, useCallback } from 'react'
import type { WordItem } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export type WordStatus = 'pending' | 'learning' | 'mastered'

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
    const [localProgress, setLocalProgress] = useState<Record<string, WordStatus>>({})
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

    // 从本地存储读取进度
    const loadFromLocal = useCallback(() => {
        try {
            const saved = localStorage.getItem('englishword_progress')
            if (saved) {
                setLocalProgress(JSON.parse(saved))
                setProgressLoaded(true)
            }
        } catch {
            // 忽略解析错误
        }
    }, [])

    // 保存到本地存储
    const saveToLocal = useCallback((progress: Record<string, WordStatus>) => {
        try {
            localStorage.setItem('englishword_progress', JSON.stringify(progress))
        } catch {
            // 忽略存储错误
        }
    }, [])

    // 下载进度（从服务器拉取）
    const downloadProgress = useCallback(async () => {
        if (!isAuthenticated || !userId || !authToken) return

        setSyncing(true)
        try {
            const res = await fetch(`${API_BASE}/api/progress?userId=${userId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            })
            const data = await res.json()
            if (data.success) {
                const progress: Record<string, WordStatus> = {}
                data.data.forEach((record: ProgressRecord) => {
                    // 服务器返回 snake_case 字段：group_name, content_en
                    const key = `${record.group_name || ''}|${record.content_en}`
                    progress[key] = record.status
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
            const deleteRecords: { groupName: string; contentEn: string }[] = []

            Object.entries(localProgress).forEach(([key, status]) => {
                const [groupName, contentEn] = key.split('|')
                
                if (status === 'pending') {
                    // pending = 没有进度，需要删除服务器上的记录
                    deleteRecords.push({ groupName, contentEn })
                } else if (status === 'learning' || status === 'mastered') {
                    // learning / mastered = 需要新增或更新
                    upsertRecords.push({
                        userId: userId,           // camelCase
                        courseName: 'EnglishWord', // camelCase
                        chapterName: chapterName,  // camelCase
                        groupName: groupName,      // camelCase
                        contentEn: contentEn,      // camelCase
                        contentZh: null,           // camelCase
                        status: status,
                    })
                }
            })

            // 1. 先处理新增/更新（POST）
            for (const record of upsertRecords) {
                console.log('POST 上传:', JSON.stringify(record))
                const res = await fetch(`${API_BASE}/api/progress`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                    },
                    body: JSON.stringify(record),
                })
                if (!res.ok) {
                    const txt = await res.text()
                    console.error('POST 上传失败:', res.status, txt, '请求体:', record)
                }
            }

            // 2. 再处理删除（DELETE）
            for (const record of deleteRecords) {
                console.log('DELETE 删除:', JSON.stringify(record))
                const res = await fetch(`${API_BASE}/api/progress?userId=${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        chapterName: chapterName,    // camelCase
                        groupName: record.groupName,  // camelCase
                        contentEn: record.contentEn,  // camelCase
                    }),
                })
                if (!res.ok) {
                    const txt = await res.text()
                    console.error('DELETE 删除失败:', res.status, txt, '请求体:', record)
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
            const current = prev[key] || 'pending'
            let next: WordStatus
            if (current === 'pending') {
                next = 'learning'
            } else if (current === 'learning') {
                next = 'pending'
            } else {
                return prev // mastered 不可点击
            }
            const updated = { ...prev, [key]: next }
            saveToLocal(updated)
            return updated
        })
    }, [getWordKey, saveToLocal])

    // 获取单词状态
    const getWordStatus = useCallback((item: WordItem): WordStatus => {
        if (!progressLoaded) return 'pending'
        const key = getWordKey(item)
        return localProgress[key] || 'pending'
    }, [progressLoaded, localProgress, getWordKey])

    return {
        localProgress,
        progressLoaded,
        syncing,
        loadFromLocal,
        downloadProgress,
        uploadProgress,
        toggleWordStatus,
        getWordStatus,
    }
}