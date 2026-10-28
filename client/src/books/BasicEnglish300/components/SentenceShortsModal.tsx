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
import { loadVoices, speak, stopAllSpeech, type SpeakHandle } from '../../../utils/speech'

/**
 * 语速。固定一档「适中」：比正常(1)慢一点便于跟读，又不至于像原来的慢速档(0.62)那样拖沓。
 * 想改快慢就调这一个数 —— 原来是个「慢速开/关」开关，用不上还占一排按钮。
 */
const SPEECH_RATE = 0.85

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
  const [showZh, setShowZh] = useState(true)
  const [highlight, setHighlight] = useState(-1)
  const [reading, setReading] = useState(false)
  /** 每次点「重播」就加一，用来强制重跑朗读 effect */
  const [replayTick, setReplayTick] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)
  /** 停在这一句上（不动、也不往下一句走） */
  const [paused, setPaused] = useState(false)
  /** 当前这次朗读的句柄 —— 暂停要拿到它来打断 */
  const speakRef = useRef<SpeakHandle | null>(null)
  /** 读到第几个词了（onBoundary 持续更新），暂停时拿它当断点 */
  const wordAtRef = useRef(-1)
  /** 断点：暂停那一刻的词下标 */
  const pauseAtRef = useRef(0)
  /** 继续时要从第几个词开口；effect 取走一次就清零，不影响切句和重播 */
  const pendingFromRef = useRef(0)
  /** 这次 cancel 是「为了暂停」而非念完 —— onEnd 靠它认出来，才不会去跳下一句 */
  const pausingRef = useRef(false)
  /** 每次点「继续」就加一，用来重跑朗读 effect */
  const [resumeTick, setResumeTick] = useState(0)

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
      // 上一次的暂停痕迹不该带进新一轮播放
      pendingFromRef.current = 0
      pauseAtRef.current = 0
      wordAtRef.current = -1
      pausingRef.current = false
    } else {
      stopAllSpeech()
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

  /**
   * 暂停 / 继续。
   *
   * 不用 speechSynthesis.pause()/resume()：桌面版 Chromium 那两个 API 长期失灵
   * （点了不动，或者暂停后继续不了），Electron 里同样靠不住。
   * 改成「打断 + 从断点续读」：暂停时 cancel 掉并记住读到第几个词，
   * 继续时把那半句剩下的部分重新送进引擎 —— 走的是 cancel + speak 这条已经验证过的路。
   */
  const togglePause = useCallback(() => {
    const handle = speakRef.current
    if (!handle) return
    if (paused) {
      // 继续：从断点那个词重新开口
      pendingFromRef.current = pauseAtRef.current
      setPaused(false)
      setResumeTick(x => x + 1)
    } else {
      // 暂停：打断。cancel 会顺带触发 onEnd，那里靠 pausingRef 认出是暂停，不跳下一句
      pauseAtRef.current = wordAtRef.current >= 0 ? wordAtRef.current : 0
      pausingRef.current = true
      handle.cancel()
      setPaused(true)
    }
  }, [paused])

  useEffect(() => {
    if (!open || !current) return

    const gen = ++genRef.current
    setImageFailed(false)
    // 切句/重播都算新的一次朗读，暂停态不该带过来
    setPaused(false)

    // 续读：从断点那个词开口。取走一次就清零，所以切句/重播不受影响。
    const from = pendingFromRef.current
    pendingFromRef.current = 0
    if (from === 0) setHighlight(-1)

    // 只把剩下那半句送进引擎。boundary 给的下标是相对这次传入的文本，
    // 所以词区间也要跟着挪（start/end 减掉偏移）。
    const full = current.en ?? ''
    const offset = from > 0 ? words[from].start : 0
    const spoken = from > 0
      ? words.slice(from).map(w => ({ ...w, start: w.start - offset, end: w.end - offset }))
      : words
    wordAtRef.current = from > 0 ? from : -1

    const handle = speak({
      text: from > 0 ? full.slice(offset) : full,
      lang: 'en-US',
      rate: SPEECH_RATE,
      onBoundary: charIndex => {
        // 落在哪个词的区间里，就亮哪个词
        const at = spoken.findIndex(w => charIndex < w.end)
        const word = at === -1 ? spoken.length - 1 : at
        wordAtRef.current = from + word
        setHighlight(from + word)
      },
      onStart: () => setReading(true),
      onEnd: () => {
        if (genRef.current !== gen) return
        // 这次「结束」是暂停打断出来的：停在当前句，等用户点继续
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
  }, [open, current, loop, words, total, replayTick, resumeTick])

  // 键盘：左右切句，Esc 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      // 空格暂停/继续。preventDefault 挡掉「空格=滚动页面」，
      // 顺带也挡掉焦点在按钮上时空格触发的那次 click，免得按一下切换两回
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
                  // 推近动画是 CSS 动画，暂停时让它也停在当下这一帧
                  animationPlayState: paused ? 'paused' : 'running',
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
              // 暂停着的时候允许重播（重新读这句），其它朗读中状态不给点
              disabled={reading && !paused}
            >
              🔊 {paused ? '已暂停' : reading ? '朗读中…' : '重播'}
            </button>
            <button
              onClick={togglePause}
              style={paused ? toggleStyle(true) : barBtnStyle}
              // 没在朗读就没什么可暂停的
              disabled={!reading}
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
        /* 有用户明确要求减少动态效果时，别逼画面一直在动 */
        @media (prefers-reduced-motion: reduce) {
          .shorts-kenburns { animation: none; }
        }
      `}</style>
    </div>
  )
}
