// client/src/books/EnglishWord/progressStorage.ts
//
// 英文单词进度的「本地存储形态」单一来源：
//  - 类型（WordStatus / LocalProgressEntry / LocalProgressMap）
//  - 解析与归一化（normalizeProgressMap）
//  - 状态守卫（isWordStatus）
//
// 历史 value 形态（迁移时都要容忍）：
//   - 'pending' | 'learning' | 'mastered'    (v1: 纯字符串)
//   - { status, chapter }                     (v2)
//   - { status, chapter, zh }                 (current)
//
// 任何新字段都应该向 LocalProgressEntry 加，并在 normalizeEntry 里补默认值；
// 任何旧 value 形态都应该被 normalizeProgressMap 兼容。

export type WordStatus = 'pending' | 'learning' | 'mastered'

export interface LocalProgressEntry {
    status: WordStatus
    chapter: string
    zh?: string
}

export type LocalProgressMap = Record<string, LocalProgressEntry>

const STATUSES: ReadonlySet<string> = new Set(['pending', 'learning', 'mastered'])

export function isWordStatus(s: unknown): s is WordStatus {
    return typeof s === 'string' && STATUSES.has(s)
}

/** 归一化单个 value：返回合法 entry，无法识别则返回 null（调用方应丢弃） */
function normalizeEntry(val: unknown): LocalProgressEntry | null {
    if (typeof val === 'string') {
        if (!isWordStatus(val)) return null
        return { status: val, chapter: '', zh: '' }
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
        const obj = val as Record<string, unknown>
        if (!isWordStatus(obj.status)) return null
        return {
            status: obj.status,
            chapter: typeof obj.chapter === 'string' ? obj.chapter : '',
            zh: typeof obj.zh === 'string' ? obj.zh : '',
        }
    }
    return null
}

export interface NormalizeResult {
    map: LocalProgressMap
    /** 为 true 表示入参里存在需要被新格式替换的条目（v1 字符串、缺字段、坏值等） */
    changed: boolean
}

/** 归一化整张进度表。损坏/非对象的整张入参会被当作需要替换的「整张坏数据」。 */
export function normalizeProgressMap(raw: unknown): NormalizeResult {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { map: {}, changed: true }
    }
    const map: LocalProgressMap = {}
    let changed = false
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
        const entry = normalizeEntry(val)
        if (!entry) {
            changed = true
            continue
        }
        map[key] = entry
        // 跟「canonical 全字段形态」不一致就算 changed，触发回写以锁新格式
        const isCanonical =
            val !== null &&
            typeof val === 'object' &&
            !Array.isArray(val) &&
            'chapter' in val &&
            'zh' in val
        if (!isCanonical) changed = true
    }
    return { map, changed }
}
