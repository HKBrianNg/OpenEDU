// client/src/books/EnglishWord/hooks/useSpeech.ts

import { useCallback, useEffect, useRef, useState } from 'react'

const supportsTTS = typeof window !== 'undefined' && 'speechSynthesis' in window

export function useSpeech() {
    const [speakingId, setSpeakingId] = useState<string | null>(null)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

    const stopSpeaking = useCallback(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel()
        }
        setSpeakingId(null)
        utteranceRef.current = null
    }, [])

    const speak = useCallback((text: string, lang: string, id: string) => {
        if (!supportsTTS) {
            return
        }

        if (speakingId === id) {
            stopSpeaking()
            return
        }

        if (speakingId) {
            window.speechSynthesis.cancel()
        }

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = lang
        utterance.rate = 0.88
        utterance.pitch = 1

        utterance.onend = () => {
            setSpeakingId(null)
            utteranceRef.current = null
        }

        utterance.onerror = () => {
            setSpeakingId(null)
            utteranceRef.current = null
        }

        utteranceRef.current = utterance
        setSpeakingId(id)
        window.speechSynthesis.speak(utterance)
    }, [speakingId, stopSpeaking])

    useEffect(() => {
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    return { speakingId, speak, stopSpeaking }
}