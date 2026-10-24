// client/src/books/BasicEnglish300/components/SentenceShortsModal.tsx
//
// 「一句话短片」播放器。
//
// 一句话 = 一个生活场景。播放时画面缓慢推近、朗读英文、字幕逐词跟上，
// 读完可以自动进下一句。这样一句对应的图像是有画面的，
// 孩子记的是「这个情形下说这句」，而不是一串孤立的字。
//
// 依赖 speech.ts 的 onBoundary 做逐词高亮，所以这里用 speak() 而不是 speakOnce()。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LessonItem } from '../types'
import { loadVoices, speak, stopAllSpeech } from '../../../utils/speech'

/** 慢速档的语速。normal 档不指定，交回给用户自己的全局设置 */
const SLOW_RATE = 0.62

interface SentenceShortsModalProps {
  lessons: LessonItem[]
  /** 把 lessonImage 文件名解析成可访问的 URL */
  resolveImageUrl: (lessonImage?: string) => string | undefined
  chapterName?: string
  open: boolean
  onClose: () => void
}

interface WordSpan {
  text: string
  start: number
  end: number
}

/** 把句子切成词，记下每个词在原文里的起止下标，供 boundary 定位 */
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
  open,
  onClose,
}: SentenceShortsModalProps) {
  const [index, setIndex] = useState(0)
  const [loop, setLoop] = useState(true)
  const [slow, setSlow] = useState(false)
  const [showZh, setShowZh] = useState(true)
  const [highlight, setHighlight] = useState(-1)
  const [reading, setReading] = useState(false)
  /** 每次点「重播」就加一，用来强制重跑朗读 effect */
  const [replayTick, setReplayTick] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)

  /**
   * 切句时旧朗读者会被 cancel，而 cancel 也会触发 onEnd。
   * 不挡住的话，「切下一句」会被旧的那次 onEnd 再推一把，连着跳好几条。
   * 每次朗读领一个号，只有号还有效才允许读完后自动往下走。
   */
  const genRef = useRef(0)

  // 进页面先把语音列表拉好，免得第一次朗读挑不到最好的音色
  useEffect(() => {
    if (open) void loadVoices()
  }, [open])

  useEffect(() => {
    if (open) {
      setIndex(0)
      setHighlight(-1)
      setImageFailed(false)
    } else {
      stopAllSpeech()
      setReading(false)
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

  useEffect(() => {
    if (!open || !current) return

    const gen = ++genRef.current
    setHighlight(-1)
    setImageFailed(false)

    const handle = speak({
      text: current.en,
      lang: 'en-US',
      rate: slow ? SLOW_RATE : undefined,
      onBoundary: charIndex => {
        // 落在哪个词的区间里，就亮哪个词
        const at = words.findIndex(w => charIndex < w.end)
        setHighlight(at === -1 ? words.length - 1 : at)
      },
      onStart: () => setReading(true),
      onEnd: () => {
        if (genRef.current !== gen) return
        setReading(false)
        setHighlight(-1)
        if (loop) setIndex(i => (i + 1) % total)
      },
    })

    return () => {
      genRef.current += 1
      handle.cancel()
    }
  }, [open, current, slow, loop, words, total, replayTick])

  // 键盘：左右切句，Esc 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, goNext, goPrev])

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

          {/* 画面。key 换=重新挂载，推近动画跟着从头播 */}
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
                }}
              />
            ) : (
              <span style={{ color: '#555', fontSize: 13 }}>（这张插图还没画）</span>
            )}
          </div>

          {/* 字幕 */}
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

          {/* 进度 */}
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

          {/* 控制条 */}
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
              disabled={reading}
            >
              🔊 {reading ? '朗读中…' : '重播'}
            </button>
            <button onClick={goNext} style={barBtnStyle}>下一句 →</button>
            <button onClick={() => setLoop(x => !x)} style={toggleStyle(loop)}>
              🔁 循环 {loop ? '开' : '关'}
            </button>
            <button onClick={() => setSlow(x => !x)} style={toggleStyle(slow)}>
              🐢 慢速 {slow ? '开' : '关'}
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
        /* 有用户明确要求减少动态效果时，别逼画面一直在动 */
        @media (prefers-reduced-motion: reduce) {
          .shorts-kenburns { animation: none; }
        }
      `}</style>
    </div>
  )
}
