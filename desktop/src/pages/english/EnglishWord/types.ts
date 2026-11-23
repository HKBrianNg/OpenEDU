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
    /** VoiceAdmin 生成音频的 slug（loadChapter 时按文件顺序算好，与 IPC 去重规则一致） */
    audioSlug?: string
    image?: string
}
