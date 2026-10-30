// client/src/books/BasicEnglish300/components/LessonLearnModal.tsx
//
// 句子学习翻卡弹窗：
//   - 默认显示中文，点击「翻面」/卡片本体后显示英文
//   - 朗读：优先 mp3（slug 来自英文），失败降级 TTS
//   - 用 learning 状态的句子作为题源

import { useEffect, useRef, useState } from 'react'
import type { LessonItem } from '../types'
import { useLocale } from '../../../store/LocaleContext'
import { applyVoiceSettings } from '../../../utils/speech'

interface LessonLearnModalProps {
  lessons: LessonItem[]
  /** 当前章节（用于推导音频路径，跟主页面 playAudio 一致） */
  chapter?: { en?: string; name?: string }
  chapterIndex?: number
  open: boolean
  onClose: () => void
}

/**
 * 英文 → slug（跟主页面 enToImageName / 测验 enToAudioName 完全一致）
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

function speakTTS(text: string, lang: 'en-US' | 'zh-CN') {
  if (!('speechSynthesis' in window) || !text) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  applyVoiceSettings(utt, lang)
  window.speechSynthesis.speak(utt)
}

/**
 * 尝试播 mp3，失败降级 TTS
 * 跟主页面 playAudio / LessonQuizModal.tryPlayAudio 同一套规则
 */
function tryPlayAudio(
  enText: string,
  zhText: string,
  lang: 'en' | 'zh',
  chapter?: { en?: string },
  chapterIndex?: number,
): void {
  const targetText = lang === 'zh' ? zhText : enText
  if (!enText) {
    if (targetText) speakTTS(targetText, lang === 'zh' ? 'zh-CN' : 'en-US')
    return
  }

  const name = enToAudioName(enText)
  if (!name) {
    if (targetText) speakTTS(targetText, lang === 'zh' ? 'zh-CN' : 'en-US')
    return
  }

  const chapterNum = chapterIndex ?? 1
  const cleanEn = chapter?.en?.toLowerCase()
    .replace(/[:\s\/\\]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/, '') || ''

  const suffix = lang === 'zh' ? 'zh' : 'en'
  const base = '/data/BasicEnglish300'

  const dirs: string[] = [
    `chapter-${chapterNum}`,
    cleanEn ? `chapter-${chapterNum}-${cleanEn}` : null,
    cleanEn,
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) as string[]

  let settled = false

  const attemptNext = (idx = 0) => {
    if (settled) return
    if (idx >= dirs.length) {
      // 全部失败 → 降级 TTS
      settled = true
      if (targetText) speakTTS(targetText, lang === 'zh' ? 'zh-CN' : 'en-US')
      return
    }

    const url = `${base}/content/audio/${dirs[idx]}/${name}_${suffix}.mp3`
    fetch(url, { method: 'HEAD' })
      .then(res => {
        if (settled) return
        if (res.ok) {
          settled = true
          // 停 TTS 再播
          if ('speechSynthesis' in window) window.speechSynthesis.cancel()
          const audio = new Audio(url)
          audio.preload = 'auto'
          audio.play().catch(() => {
            if (targetText) speakTTS(targetText, lang === 'zh' ? 'zh-CN' : 'en-US')
          })
        } else {
          attemptNext(idx + 1)
        }
      })
      .catch(() => {
        if (!settled) attemptNext(idx + 1)
      })
  }

  attemptNext()
}

export default function LessonLearnModal({ lessons, chapter, chapterIndex, open, onClose }: LessonLearnModalProps) {
  const { t } = useLocale()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      setIndex(0)
      setFlipped(false)
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open])

  // 翻卡 / 切换句子时自动朗读当前面
  useEffect(() => {
    if (!open || lessons.length === 0) return
    const cur = lessons[index]
    if (!cur) return

    if (flipped) {
      // 背面 → 播英文 mp3
      tryPlayAudio(cur.en ?? '', cur.name ?? '', 'en', chapter, chapterIndex)
    } else {
      // 正面 → 播中文 mp3
      tryPlayAudio(cur.en ?? '', cur.name ?? '', 'zh', chapter, chapterIndex)
    }
  }, [index, flipped, open, lessons, chapter, chapterIndex])

  if (!open) return null
  if (lessons.length === 0) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.42)',
          zIndex: 1400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '24px 28px',
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          <p style={{ fontSize: 15, color: '#666' }}>
            {t('basicenglish300.learnEmpty') || '还没有「学习中」的句子可学习。先把句子标记为学习中再试。'}
          </p>
          <button
            onClick={onClose}
            style={{
              marginTop: 14,
              padding: '8px 28px',
              fontSize: 14,
              borderRadius: 99,
              border: '1px solid #d0d0d0',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            {t('basicenglish300.close') || '关闭'}
          </button>
        </div>
      </div>
    )
  }

  const current = lessons[index]
  const frontText = current.name
  const backText = current.en

  function next() {
    if (index < lessons.length - 1) {
      setIndex(i => i + 1)
      setFlipped(false)
    } else {
      setIndex(0)
      setFlipped(false)
    }
  }

  function prev() {
    if (index > 0) {
      setIndex(i => i - 1)
      setFlipped(false)
    } else {
      setIndex(lessons.length - 1)
      setFlipped(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.42)',
        zIndex: 1400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          width: 'min(540px, 92vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '24px 22px 20px',
          boxShadow: '0 10px 32px rgba(0,0,0,0.19)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 660 }}>
            {t('basicenglish300.learnTitle') || '句子学习'}
          </h3>
          <span style={{ fontSize: 13, color: '#777' }}>
            {index + 1} / {lessons.length}
          </span>
        </div>

        <div
          onClick={() => setFlipped(f => !f)}
          style={{
            border: '1.5px solid #e3e8ef',
            borderRadius: 14,
            padding: '40px 20px',
            textAlign: 'center',
            background: flipped ? '#f6ffed' : '#f6f8fb',
            cursor: 'pointer',
            minHeight: 180,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            transition: 'background 0.2s ease',
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 640,
              color: '#222',
              lineHeight: 1.4,
              marginBottom: 10,
            }}
          >
            {flipped ? backText : frontText}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {flipped
              ? t('basicenglish300.learnClickToBack') || '点击翻回中文'
              : t('basicenglish300.learnClickToFlip') || '点击翻面看英文'}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 18,
          }}
        >
          <button
            onClick={prev}
            style={{
              padding: '8px 22px',
              fontSize: 14,
              borderRadius: 99,
              border: '1px solid #d0d0d0',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            ← {t('basicenglish300.prev') || '上一句'}
          </button>
          <button
            onClick={() => tryPlayAudio(current.en ?? '', current.name ?? '', 'en', chapter, chapterIndex)}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              borderRadius: 99,
              border: '1px solid #d0d0d0',
              background: '#fff',
              color: '#1976d2',
              cursor: 'pointer',
            }}
          >
            🔊 {t('basicenglish300.readEnglish') || '读英文'}
          </button>
          <button
            onClick={next}
            style={{
              padding: '8px 22px',
              fontSize: 14,
              borderRadius: 99,
              border: '1px solid #d0d0d0',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            {t('basicenglish300.next') || '下一句'} →
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 20px',
              fontSize: 12,
              borderRadius: 99,
              border: 'none',
              background: 'transparent',
              color: '#888',
              cursor: 'pointer',
            }}
          >
            {t('basicenglish300.close') || '关闭'}
          </button>
        </div>
      </div>
    </div>
  )
}