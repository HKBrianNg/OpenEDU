export interface Chapter {
    name: string
    en: string
    contentLink: string
}
export interface IndexData {
    title: string
    titleEn: string
    chapters: Chapter[]
}
export interface WordItem {
    name?: string
    en?: string
    en_sentense?: string
    zh_sentense?: string
    group?: string
    url?: string
    image?: string
}
