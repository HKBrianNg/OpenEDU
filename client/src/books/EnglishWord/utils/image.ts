// 单词配图：卡片只有 148px 高，直接用 content/ 下的原图（普遍 1024px 宽、最大的 3061px）
// 太浪费，一个章节几百张就是十几 MB。所以统一取 content/thumb/ 里的缩略图（长边 400px）。
//
// 缩略图由 img-library 仓库的 scripts/gen-thumbs.mjs 生成；新加的图如果还没跑脚本，
// thumb/ 里就没有，这时回退到原图 —— 见调用处的 onError。

import type { WordItem } from '../types'
import { getCourseImageUrl } from '../../../utils/coursePath'

const COURSE_ID = 'EnglishWord'

export function getImageName(en?: string) {
    return (
        en
            ?.trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '') + '.jpg'
    )
}

function getImageFile(item: WordItem) {
    return item.url?.trim() ? item.url : item.en ? getImageName(item.en) : undefined
}

/** 缩略图（卡片、测验用这个） */
export function getWordImageSrc(item: WordItem) {
    const file = getImageFile(item)
    return file ? getCourseImageUrl(COURSE_ID, `thumb/${file}`) : undefined
}

/** 原图，仅作兜底 —— 缩略图不存在时退回它 */
export function getWordImageFullSrc(item: WordItem) {
    return getCourseImageUrl(COURSE_ID, getImageFile(item))
}
