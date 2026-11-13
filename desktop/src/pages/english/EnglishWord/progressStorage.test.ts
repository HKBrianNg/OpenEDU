// client/src/books/EnglishWord/progressStorage.test.ts
//
// 锁定 normalizeProgressMap 对各历史/异常形态的归一化行为。
// 兼容表见 progressStorage.ts 顶部注释；这里只把最关键的几个不变式写出来。

import { describe, expect, it } from 'vitest'
import {
    isWordStatus,
    normalizeProgressMap,
    type WordStatus,
} from './progressStorage'

describe('isWordStatus', () => {
    it('accepts the three known statuses', () => {
        expect(isWordStatus('pending')).toBe(true)
        expect(isWordStatus('learning')).toBe(true)
        expect(isWordStatus('mastered')).toBe(true)
    })

    it('rejects anything else', () => {
        expect(isWordStatus('foo')).toBe(false)
        expect(isWordStatus('')).toBe(false)
        expect(isWordStatus(null)).toBe(false)
        expect(isWordStatus(undefined)).toBe(false)
        expect(isWordStatus(1)).toBe(false)
        expect(isWordStatus({ status: 'mastered' })).toBe(false)
    })
})

describe('normalizeProgressMap', () => {
    it('normalizes v1 (string) entries to canonical and marks changed', () => {
        const raw = {
            'a|apple': 'mastered',
            'b|banana': 'learning',
        }
        const { map, changed } = normalizeProgressMap(raw)

        expect(changed).toBe(true)
        expect(map).toEqual({
            'a|apple': { status: 'mastered', chapter: '', course: 'EnglishWord' },
            'b|banana': { status: 'learning', chapter: '', course: 'EnglishWord' },
        })
    })

    it('passes canonical entries through unchanged and does not flag changed', () => {
        const raw = {
            'a|apple': { status: 'mastered' as WordStatus, chapter: '幼稚园', zh: '苹果', course: 'EnglishWord' },
        }
        const { map, changed } = normalizeProgressMap(raw)

        expect(changed).toBe(false)
        expect(map).toEqual(raw)
    })

    it('fills missing course field and marks changed', () => {
        const raw = {
            'a|apple': { status: 'mastered' as WordStatus, chapter: '幼稚园', zh: '苹果' },
        }
        const { map, changed } = normalizeProgressMap(raw)

        expect(changed).toBe(true)
        expect(map['a|apple']?.course).toBe('EnglishWord')
    })

    it('preserves a non-default course field', () => {
        const raw = {
            'k1|Good morning.': { status: 'learning' as WordStatus, chapter: 'Lesson 1', zh: '早上好', course: 'BasicEnglish300' },
        }
        const { map, changed } = normalizeProgressMap(raw)

        expect(changed).toBe(false)
        expect(map['k1|Good morning.']?.course).toBe('BasicEnglish300')
    })

    it('fills missing fields on v2 entries and marks changed', () => {
        const raw = {
            'a|apple': { status: 'learning', chapter: '幼稚园' }, // 缺 zh、course
        }
        const { map, changed } = normalizeProgressMap(raw)

        expect(changed).toBe(true)
        expect(map['a|apple']).toEqual({
            status: 'learning',
            chapter: '幼稚园',
            zh: '',
            course: 'EnglishWord',
        })
    })

    it('drops entries with invalid status and marks changed', () => {
        const raw = {
            'a|apple': { status: 'foo', chapter: '幼稚园', zh: '苹果' },
            'b|banana': { status: 1, chapter: '幼稚园' },
        }
        const { map, changed } = normalizeProgressMap(raw)

        expect(changed).toBe(true)
        expect(map).toEqual({}) // 两条都被丢
    })

    it('keeps valid entries while dropping bad ones in mixed input', () => {
        const raw = {
            'a|apple': 'mastered',                       // v1
            'b|banana': { status: 'foo' },               // 坏
            'c|cherry': null,                            // 坏
            'd|durian': { status: 'learning', chapter: '幼稚园', zh: '榴莲' },
        }
        const { map, changed } = normalizeProgressMap(raw)

        expect(changed).toBe(true)
        expect(Object.keys(map).sort()).toEqual(['a|apple', 'd|durian'])
        expect(map['a|apple']).toEqual({ status: 'mastered', chapter: '', course: 'EnglishWord' })
        expect(map['d|durian']).toEqual({ status: 'learning', chapter: '幼稚园', zh: '榴莲', course: 'EnglishWord' })
    })

    it('treats a wholly bad input as needing replacement', () => {
        const cases: unknown[] = [null, undefined, 0, 'string', [], 42]
        for (const raw of cases) {
            const { map, changed } = normalizeProgressMap(raw)
            expect(changed).toBe(true)
            expect(map).toEqual({})
        }
    })
})
