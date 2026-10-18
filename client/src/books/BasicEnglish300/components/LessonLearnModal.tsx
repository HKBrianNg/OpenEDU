// client/src/books/BasicEnglish300/components/LessonLearnModal.tsx
//
// 句子学习翻卡弹窗：
//   - 默认显示中文，点击「翻面」/卡片本体后显示英文
//   - 自动 TTS 朗读当前面的内容
//   - 用 learning 状态的句子作为题源

import { useEffect, useState } from 'react'
import type { LessonItem } from '../types'
import { useLocale } from '../../../store/LocaleContext'
import { applyVoiceSettings } from '../../../utils/speech'

interface LessonLearnModalProps {
  lessons: LessonItem[]
  open: boolean
  onClose: () => void
}

function speak(text: string, lang: 'en-US' | 'zh-CN') {
  if (!('speechSynthesis' in window) || !text) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  applyVoiceSettings(utt, lang)
  window.speechSynthesis.speak(utt)
}

export default function LessonLearnModal({ lessons, open, onClose }: LessonLearnModalProps) {
  const { t } = useLocale()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 弹窗从关→开 是一次性的状态机入口：open prop 是外部状态，effect 用来把内部状态同步到「初始」 */
    if (open) {
      setIndex(0)
      setFlipped(false)
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open])

  useEffect(() => {
    if (!open || lessons.length === 0) return
    const cur = lessons[index]
    if (!cur) return
    // 翻到正面时读中文，翻面后读英文
    speak(flipped ? cur.en : cur.name, flipped ? 'en-US' : 'zh-CN')
  }, [index, flipped, open, lessons])

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
            onClick={() => speak(current.en, 'en-US')}
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
