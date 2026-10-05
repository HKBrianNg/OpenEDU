// client/src/books/EnglishWord/utils/image.ts

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

export function getWordImageSrc(item: WordItem) {
    const imageName = item.url?.trim()
        ? item.url
        : item.en
          ? getImageName(item.en)
          : undefined

    return getCourseImageUrl(COURSE_ID, imageName)
}