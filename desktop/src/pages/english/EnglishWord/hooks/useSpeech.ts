// desktop/src/pages/english/EnglishWord/hooks/useSpeech.ts
// mp3 优先：VoiceAdmin 生成的音频（EnglishWord/.audio/<stem>/<slug>...mp3）
// 由调用方拼好 audioUrl 传入；命中就直接播，404/加载失败回退浏览器 TTS。

import { useCallback, useEffect, useRef, useState } from 'react'
import { applyVoiceSettings, type SpeechLang } from '../../../../utils/speech'

const supportsTTS = typeof window !== 'undefined' && 'speechSynthesis' in window

export function useSpeech() {
    const [speakingId, setSpeakingId] = useState<string | null>(null)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const speakingIdRef = useRef<string | null>(null)

    // 同步 speakingId 到 ref，避免闭包陷阱
    useEffect(() => {
        speakingIdRef.current = speakingId
    }, [speakingId])

    const stopSpeaking = useCallback(() => {
        if (supportsTTS && window.speechSynthesis) {
            window.speechSynthesis.cancel()
        }
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
        }
        speakingIdRef.current = null
        setSpeakingId(null)
        utteranceRef.current = null
    }, [])

    // 浏览器 TTS 播放（mp3 缺失时的回退路径）
    const speakTts = useCallback((text: string, lang: string, id: string) => {
        if (!supportsTTS) return

        // 强制取消所有排队/正在播的语音（解决假死）
        window.speechSynthesis.cancel()

        // 延迟 50ms 再播，让引擎彻底重置（Chromium 必需）
        setTimeout(() => {
            if (!supportsTTS) return

            const utterance = new SpeechSynthesisUtterance(text)
            applyVoiceSettings(utterance, lang as SpeechLang)

            // 防止被 GC 回收导致中断
            utteranceRef.current = utterance

            utterance.onend = () => {
                speakingIdRef.current = null
                setSpeakingId(null)
                utteranceRef.current = null
            }

            utterance.onerror = () => {
                speakingIdRef.current = null
                setSpeakingId(null)
                utteranceRef.current = null
            }

            speakingIdRef.current = id
            setSpeakingId(id)
            window.speechSynthesis.speak(utterance)
        }, 50)
    }, [])

    const speak = useCallback(
        (text: string, lang: string, id: string, audioUrl?: string) => {
            // 如果正在播同一个 id，则停止
            if (speakingIdRef.current === id) {
                stopSpeaking()
                return
            }

            stopSpeaking()

            // 有预生成音频：直接播 mp3，加载/播放失败回退 TTS
            if (audioUrl) {
                const audio = new Audio(audioUrl)
                audioRef.current = audio
                const finish = () => {
                    if (speakingIdRef.current === id) {
                        speakingIdRef.current = null
                        setSpeakingId(null)
                    }
                    audioRef.current = null
                }
                audio.onended = finish
                audio.onerror = () => {
                    finish()
                    speakTts(text, lang, id)
                }
                speakingIdRef.current = id
                setSpeakingId(id)
                audio.play().catch(() => {
                    finish()
                    speakTts(text, lang, id)
                })
                return
            }

            speakTts(text, lang, id)
        },
        [stopSpeaking, speakTts],
    )

    useEffect(() => {
        return () => {
            if (supportsTTS && window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
            }
        }
    }, [])

    return { speakingId, speak, stopSpeaking }
}
