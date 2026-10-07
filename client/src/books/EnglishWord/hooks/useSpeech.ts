// client/src/books/EnglishWord/hooks/useSpeech.ts

import { useCallback, useEffect, useRef, useState } from 'react'

const supportsTTS = typeof window !== 'undefined' && 'speechSynthesis' in window

export function useSpeech() {
    const [speakingId, setSpeakingId] = useState<string | null>(null)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
    const speakingIdRef = useRef<string | null>(null)

    // 同步 speakingId 到 ref，避免闭包陷阱
    useEffect(() => {
        speakingIdRef.current = speakingId
    }, [speakingId])

    const stopSpeaking = useCallback(() => {
        if (supportsTTS && window.speechSynthesis) {
            window.speechSynthesis.cancel()
        }
        speakingIdRef.current = null
        setSpeakingId(null)
        utteranceRef.current = null
    }, [])

    const speak = useCallback((text: string, lang: string, id: string) => {
        if (!supportsTTS) {
            return
        }

        // 如果正在播同一个 id，则停止
        if (speakingIdRef.current === id) {
            stopSpeaking()
            return
        }

        // 强制取消所有排队/正在播的语音（解决假死）
        window.speechSynthesis.cancel()

        // 延迟 50ms 再播，让引擎彻底重置（Chromium 必需）
        setTimeout(() => {
            if (!supportsTTS) return

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = lang
            utterance.rate = 0.88
            utterance.pitch = 1

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
    }, [stopSpeaking])

    useEffect(() => {
        return () => {
            if (supportsTTS && window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    return { speakingId, speak, stopSpeaking }
}