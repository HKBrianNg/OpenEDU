// client/src/books/BasicEnglish300/components/SentenceShortsModal.tsx
//
// 「一句话短片」播放器。
// 英文优先播 mp3，失败降级 TTS（逐词高亮保留）。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LessonItem } from '../types'
import { loadVoices, speak, stopAllSpeech, type SpeakHandle } from '../../../utils/speech'

const SPEECH_RATE = 0.85

/**
 * 把英文句子转成文件名格式
 * "Change into your slippers first" → "change-into-your-slippers-first"
 */
function enToAudioName(en: string): string {
  if (!en) return ''
  return en
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

interface SentenceShortsModalProps {
  lessons: LessonItem[]
  resolveImageUrl: (lessonImage?: string) => string | undefined
  chapterName?: string
  chapterIndex?: number
  open: boolean
  onClose: () => void
}

interface WordSpan {
  text: string
  start: number
  end: number
}

function splitWords(text: string): WordSpan[] {
  const spans: WordSpan[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    spans.push({ text: m[0], start: m.index, end: m.index + m[0].length })
  }
  return spans
}

export default function SentenceShortsModal({
  lessons,
  resolveImageUrl,
  chapterName,
  chapterIndex,
  open,
  onClose,
}: SentenceShortsModalProps) {
  const [index, setIndex] = useState(0)
  const [loop, setLoop] = useState(true)
  const [showZh, setShowZh] = useState(true)
  const [highlight, setHighlight] = useState(-1)
  const [reading, setReading] = useState(false)
  const [replayTick, setReplayTick] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)
  const [paused, setPaused] = useState(false)

  const speakRef = useRef<SpeakHandle | null>(null)
  const wordAtRef = useRef(-1)
  const pauseAtRef = useRef(0)
  const pendingFromRef = useRef(0)
  const pausingRef = useRef(false)
  const genRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (open) void loadVoices()
  }, [open])

  useEffect(() => {
    if (open) {
      setIndex(0)
      setHighlight(-1)
      setImageFailed(false)
      pendingFromRef.current = 0
      pauseAtRef.current = 0
      wordAtRef.current = -1
      pausingRef.current = false
    } else {
      stopAllSpeech()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setReading(false)
      setPaused(false)
    }
  }, [open])

  const total = lessons.length
  const current = open && total > 0 ? lessons[index] : undefined
  const words = useMemo(() => splitWords(current?.en ?? ''), [current?.en])

  const goPrev = useCallback(() => {
    setHighlight(-1)
    setIndex(i => (i - 1 + total) % total)
  }, [total])

  const goNext = useCallback(() => {
    setHighlight(-1)
    setIndex(i => (i + 1) % total)
  }, [total])

  const togglePause = useCallback(() => {
    // mp3 模式
    if (audioRef.current && !paused) {
      audioRef.current.pause()
      setPaused(true)
      setReading(false)
      return
    }
    if (audioRef.current && paused) {
      audioRef.current.play()
      setPaused(false)
      setReading(true)
      return
    }

    // TTS 模式
    const handle = speakRef.current
    if (!handle) return
    if (paused) {
      pendingFromRef.current = pauseAtRef.current
      setPaused(false)
      setReplayTick(x => x + 1)
    } else {
      pauseAtRef.current = wordAtRef.current >= 0 ? wordAtRef.current : 0
      pausingRef.current = true
      handle.cancel()
      setPaused(true)
    }
  }, [paused])

  /**
   * 尝试播 mp3。内部失败自动 setReplayTick 触发降级。
   */
  const tryPlayAudio = useCallback((): boolean => {
    if (!current?.en) return false

    const name = enToAudioName(current.en)
    if (!name) return false

    const num = chapterIndex ?? 1
    const chapterDir = `chapter-${num}`
    const url = `/data/BasicEnglish300/content/audio/${chapterDir}/${name}_en.mp3`

    const audio = new Audio(url)
    audio.preload = 'auto'
    audioRef.current = audio

    audio.onended = () => {
      audioRef.current = null
      setReading(false)
      setHighlight(-1)
      wordAtRef.current = -1
      if (loop) setIndex(i => (i + 1) % total)
    }

    audio.onerror = () => {
      audioRef.current = null
      console.warn(`[短片] mp3 失败，降级 TTS: ${url}`)
      setReplayTick(x => x + 1)
    }

    audio.oncanplaythrough = () => {
      setReading(true)
    }

    audio.play().catch(err => {
      audioRef.current = null
      console.warn(`[短片] play() 被拒，降级 TTS:`, err.message)
      setReplayTick(x => x + 1)
    })

    return true
  }, [current, chapterIndex, loop, total])

  // 朗读 effect
  useEffect(() => {
    if (!open || !current) return

    const gen = ++genRef.current
    setImageFailed(false)
    setPaused(false)

    const from = pendingFromRef.current
    pendingFromRef.current = 0
    if (from === 0) setHighlight(-1)

    const full = current.en ?? ''
    const offset = from > 0 ? words[from].start : 0
    const spoken = from > 0
      ? words.slice(from).map(w => ({ ...w, start: w.start - offset, end: w.end - offset }))
      : words
    wordAtRef.current = from > 0 ? from : -1

    // 无断点 → 先试 mp3
    if (from === 0) {
      const launched = tryPlayAudio()
      if (launched && audioRef.current) {
        return () => {
          genRef.current += 1
          // 不 cancel，让 audio 自然播完或被外部关掉
        }
      }
    }

    // TTS 降级（断点续读 / mp3 失败后的重跑）
    const handle = speak({
      text: from > 0 ? full.slice(offset) : full,
      lang: 'en-US',
      rate: SPEECH_RATE,
      onBoundary: charIndex => {
        const at = spoken.findIndex(w => charIndex < w.end)
        const word = at === -1 ? spoken.length - 1 : at
        wordAtRef.current = from + word
        setHighlight(from + word)
      },
      onStart: () => setReading(true),
      onEnd: () => {
        if (genRef.current !== gen) return
        if (pausingRef.current) {
          pausingRef.current = false
          return
        }
        setReading(false)
        setHighlight(-1)
        wordAtRef.current = -1
        if (loop) setIndex(i => (i + 1) % total)
      },
    })

    speakRef.current = handle

    return () => {
      genRef.current += 1
      pausingRef.current = false
      handle.cancel()
      if (speakRef.current === handle) speakRef.current = null
    }
  }, [open, current, loop, words, total, replayTick, chapterIndex, tryPlayAudio])

  // 键盘
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.code === 'Space') {
        e.preventDefault()
        togglePause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, goNext, goPrev, togglePause])

  if (!open) return null

  const imageUrl = resolveImageUrl(current?.lessonImage)

  const barBtnStyle: React.CSSProperties = {
    padding: '7px 15px',
    fontSize: 13,
    borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.28)',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
  const toggleStyle = (on: boolean): React.CSSProperties => ({
    ...barBtnStyle,
    border: on ? '1px solid #7fd1a8' : '1px solid rgba(255,255,255,0.28)',
    background: on ? 'rgba(127,209,168,0.18)' : 'transparent',
    color: on ? '#9ff0c8' : '#fff',
  })

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.93)',
        zIndex: 1500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        userSelect: 'none',
      }}
    >
      {!current || total === 0 ? (
        <p style={{ color: '#bbb', fontSize: 15 }}>
          没有可播放的句子，先把句子标记为「学习中」再试。
        </p>
      ) : (
        <>
          {chapterName && (
            <div style={{ fontSize: 13, color: '#888', letterSpacing: 0.5 }}>
              {chapterName}
            </div>
          )}

          <div
            style={{
              width: 'min(680px, 90vw)',
              height: 'min(46vh, 400px)',
              borderRadius: 14,
              overflow: 'hidden',
              background: '#111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
            }}
          >
            {imageUrl && !imageFailed ? (
              <img
                key={current.en}
                className="shorts-kenburns"
                src={imageUrl}
                alt={current.en}
                onError={() => setImageFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  animationPlayState: paused ? 'paused' : 'running',
                }}
              />
            ) : (
              <span style={{ color: '#555', fontSize: 13 }}>（这张插图还没画）</span>
            )}
          </div>

          <div style={{ width: 'min(680px, 90vw)', textAlign: 'center' }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 620,
                color: '#fff',
                lineHeight: 1.45,
                minHeight: 42,
              }}
            >
              {words.map((w, i) => (
                <span
                  key={`${w.start}-${i}`}
                  style={{
                    color: i === highlight ? '#ffd75e' : '#fff',
                    transition: 'color 0.12s linear',
                  }}
                >
                  {w.text}
                  {i < words.length - 1 ? ' ' : ''}
                </span>
              ))}
            </div>
            {showZh && (
              <div style={{ marginTop: 8, fontSize: 15, color: '#9aa0a6' }}>
                {current.name}
              </div>
            )}
          </div>

          <div
            style={{
              width: 'min(680px, 90vw)',
              height: 3,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.14)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${((index + 1) / total) * 100}%`,
                height: '100%',
                background: '#ffd75e',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <div
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button onClick={goPrev} style={barBtnStyle}>← 上一句</button>
            <button
              onClick={() => setReplayTick(x => x + 1)}
              style={barBtnStyle}
              disabled={reading && !paused}
            >
              🔊 {paused ? '已暂停' : reading ? '朗读中…' : '重播'}
            </button>
            <button
              onClick={togglePause}
              style={paused ? toggleStyle(true) : barBtnStyle}
              disabled={!reading && !audioRef.current}
              title="空格键也可以暂停 / 继续"
            >
              {paused ? '▶ 继续' : '⏸ 暂停'}
            </button>
            <button onClick={goNext} style={barBtnStyle}>下一句 →</button>
            <button onClick={() => setLoop(x => !x)} style={toggleStyle(loop)}>
              🔁 循环 {loop ? '开' : '关'}
            </button>
            <button onClick={() => setShowZh(x => !x)} style={toggleStyle(showZh)}>
              中文 {showZh ? '开' : '关'}
            </button>
            <span style={{ fontSize: 13, color: '#888', marginLeft: 4 }}>
              {index + 1} / {total}
            </span>
            <button onClick={onClose} style={barBtnStyle}>关闭 ✕</button>
          </div>
        </>
      )}

      <style>{`
        .shorts-kenburns {
          animation: shorts-kenburns 7s ease-out forwards;
        }
        @keyframes shorts-kenburns {
          from { transform: scale(1) translateY(0); }
          to   { transform: scale(1.1) translateY(-1.5%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .shorts-kenburns { animation: none; }
        }
      `}</style>
    </div>
  )
}