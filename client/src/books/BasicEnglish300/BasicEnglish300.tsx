// client/src/books/BasicEnglish300/BasicEnglish300.tsx
//
// 300 句基础英语：
//   - 状态切换（pending / learning / mastered）
//   - 状态过滤
//   - 句子学习（翻卡）
//   - 三卷测验（听音选句 / 认句选义 / 拼写首词）
//   - 进度同步（download / upload）
//   - 列表行内显示图片，句子点击即朗读
//
// ★ 数据适配层：新格式 { title:{zh,en} } → 展平为 { name, en }，供渲染层与子组件继续使用旧字段名
// ★ 图片规则：图片名由 title.en 派生 → 小写、去标点、空格转连字符，放在 content/images/ 下

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, Collapse, Spin } from 'antd';
import { getCourseBaseUrl, getCourseDataUrl } from '../../utils/coursePath';
import { safeJsonFetch } from '../../utils/safeFetch';
import { applyVoiceSettings } from '../../utils/speech';
import { useLocale } from '../../store/LocaleContext';
import { useAuth } from '../../store/AuthContext';
import { useProgress } from '../EnglishWord/hooks/useProgress';
import WordStatusButton from '../EnglishWord/components/WordStatusButton';
import StatusFilter, { type StatusFilterValue } from '../EnglishWord/components/StatusFilter';
import ProgressButtons from '../EnglishWord/components/ProgressButtons';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { BasicEnglishData, LessonItem } from './types';
import LessonLearnModal from './components/LessonLearnModal';
import LessonQuizModal from './components/LessonQuizModal';
import SentenceShortsModal from './components/SentenceShortsModal';

const { Title, Paragraph } = Typography;

const COURSE_ID = 'BasicEnglish300';
const BASIC_ENGLISH_COURSE = 'BasicEnglish300';

interface BasicEnglish300Props {
  onExit?: () => void;
}

/** 给 LessonItem 补上 group 字段（= 章节名），让 useProgress 默认 key 派生能把章节纳入 */
function withGroup<T extends object>(item: T, group: string): T & { group: string } {
  return { ...item, group }
}

/**
 * ★ 把英文句子转成图片文件名：
 *   小写 → 去掉所有标点 → 空格转连字符
 *   "Can I have some candy?" → "can-i-have-some-candy"
 *   "I'll be good!"           → "ill-be-good"
 */
const enToImageName = (en: string): string => {
  if (!en) return '';
  return en
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')   // 去掉非字母数字非空格（含 ? ! ' " , .）
    .trim()
    .replace(/\s+/g, '-')           // 空格转连字符
    .replace(/-+/g, '-');           // 合并连续连字符
};

/**
 * ★ 适配函数：把新格式 { title:{zh,en} } 展平为渲染层期望的 { name, en }，
 *   并顺带把图片名（由 title.en 派生）注入 lessonImage。
 *   子组件（Learn / Quiz / Shorts）内部还在读 name / en / lessonImage，这里统一喂好。
 */
function adaptItem(item: LessonItem): LessonItem {
  const enText = item.title?.en?.trim() || item.en || '';
  const imageName = enToImageName(enText);
  
  // 用 any 读取兼容字段，避免 TS 报错，同时不污染 LessonItem 类型
  const raw = item as any;
  
  return {
    ...item,
    name: item.title?.zh?.trim() || item.name || '',
    en: enText,
    lessonImage: item.lessonImage 
      || raw.image 
      || raw.img 
      || raw.picture 
      || raw.thumbnail
      || (imageName ? `${imageName}.jpg` : undefined),
  }
}
/** 简单一句即读：停止当前朗读后开始新的（不维护高亮等状态机） */
function speakOnce(text: string | undefined, lang: 'en-US' | 'zh-CN'): void {
  if (!text) return;
  if (!('speechSynthesis' in window)) {
    console.warn('当前浏览器不支持语音朗读');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  applyVoiceSettings(utterance, lang);
  window.speechSynthesis.speak(utterance);
}

const BasicEnglish300: React.FC<BasicEnglish300Props> = () => {
  const { t } = useLocale();
  const { user, token, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [data, setData] = useState<BasicEnglishData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 弹窗状态
  const [learnOpen, setLearnOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [shorts, setShorts] = useState<{ lessons: LessonItem[]; chapterName: string } | null>(null);

  // 进度 hook
  const {
    progressLoaded,
    syncing,
    downloadProgress,
    uploadProgress,
    toggleWordStatus,
    getWordStatus,
    setWordStatus,
    loadFromLocal,
  } = useProgress({
    userId: user?.id,
    token,
    isAuthenticated,
    course: BASIC_ENGLISH_COURSE,
  });

  useEffect(() => {
    loadFromLocal();
  }, [loadFromLocal]);

  // 数据加载：先拉主数据，再并行拉每个章节的 lessonsFile
  useEffect(() => {
    let cancelled = false;
    setLoading(true)
    setLoadError(null)

    safeJsonFetch<BasicEnglishData>(getCourseDataUrl(COURSE_ID))
      .then(async (json) => {
        if (cancelled) return
        if (!json.chapters || json.chapters.length === 0) {
          setLoadError('数据为空或格式不匹配')
          setLoading(false)
          return
        }

        // 先把只有章节名的主数据设上去（让页面先显示章节列表）
        setData(json)

        const base = getCourseBaseUrl(COURSE_ID)
        const chapterPromises = json.chapters.map(async (chapter) => {
          const file = chapter.lessonsFile || chapter.contentLink
          if (!file) return chapter

          // 尝试多种路径拼接（兼容不同目录结构）
          const tryUrls = [
            `${base}/content/${file.replace(/^\/+/, '')}`,
            `${base}/${file.replace(/^\/+/, '')}`,
            `/books/${COURSE_ID}/content/${file.replace(/^\/+/, '')}`,
          ]

          for (const url of tryUrls) {
            try {
              const res = await fetch(url)
              if (!res.ok) continue // 404 就试下一个

              // 关键防御：先看 Content-Type，避免把 HTML 当 JSON 解析
              const contentType = res.headers.get('content-type') || ''
              if (!contentType.includes('application/json')) {
                const text = await res.text()
                if (text.trim().startsWith('<')) {
                  console.warn(`[跳过] ${url} 返回了 HTML (可能是 404)，尝试下一个...`)
                  continue
                }
              }

              const content = await res.json()
              const rawItems = Array.isArray(content)
                ? content
                : (content.items || content.chapters?.[0]?.items || [])

              // ★ 每条 item 统一走 adaptItem：name/en 展平 + 图片名由 en 派生
              const items = rawItems.map((item: any) => adaptItem(item))

              return { ...chapter, items }
            } catch (err) {
              console.warn(`[失败] ${url}:`, err)
            }
          }

          console.warn(`章节 "${chapter.name}" 所有路径都失败了，保持空白`)
          return chapter
        })

        const loadedChapters = await Promise.all(chapterPromises)
        if (!cancelled) {
          setData(prev => prev ? { ...prev, chapters: loadedChapters } : prev)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof Error) setLoadError(err.message)
        else setLoadError('数据加载失败')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // 图片 URL 解析：支持完整 URL / base64 / content/images/ 前缀 / 纯文件名
  const resolveImageUrl = (lessonImage?: string): string | undefined => {
    if (!lessonImage) return undefined;
    if (/^https?:\/\//.test(lessonImage) || lessonImage.startsWith('data:')) return lessonImage;

    const base = getCourseBaseUrl(COURSE_ID);
    const clean = lessonImage.replace(/^\/+/, '');

    // 已经带 content/images/ 或 images/ 前缀，直接拼 base
    if (clean.startsWith('content/images/') || clean.startsWith('images/')) {
      return `${base}/${clean}`;
    }
    // 纯文件名（can-i-have-some-candy.jpg）→ 补上 content/images/
    return `${base}/content/images/${clean}`;
  };

  // ★ allLessons：每个 item 再走一遍 adaptItem（兜底），且 items 空值防御
  const allLessons = useMemo(() => {
    if (!data?.chapters) return []
    return data.chapters.flatMap(c =>
      (c.items || []).map(i => ({ lesson: adaptItem(i), chapter: c }))
    )
  }, [data])

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilterValue, number> = { all: 0, pending: 0, learning: 0, mastered: 0 }
    for (const { lesson, chapter } of allLessons) {
      const meta = withGroup(lesson, chapter.name)
      counts[getWordStatus(meta)] += 1
      counts.all += 1
    }
    return counts
  }, [allLessons, getWordStatus])

  // ★ learningLessons：同样走 adaptItem 兜底
  const learningLessons = useMemo(
    () => allLessons
      .filter(({ lesson, chapter }) => getWordStatus(withGroup(lesson, chapter.name)) === 'learning')
      .map(({ lesson }) => adaptItem(lesson)),
    [allLessons, getWordStatus]
  )

  // 加载状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin description="加载中..." />
      </div>
    );
  }
  if (loadError) {
    return (
      <div style={{ padding: 24, color: '#d93025' }}>
        <h3>数据加载失败</h3>
        <p>{loadError}</p>
      </div>
    );
  }
  if (!data) return null;

  const actionButtonStyle = {
    padding: '6px 14px',
    fontSize: 13,
    borderRadius: 99,
    border: '1px solid #d0d0d0',
    background: '#fff',
    color: '#333',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }

  return (
    <div style={{ padding: isMobile ? 14 : 20, maxWidth: 900, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <ProgressButtons
          isAuthenticated={isAuthenticated}
          progressLoaded={progressLoaded}
          syncing={syncing}
          onDownload={downloadProgress}
          onUpload={uploadProgress}
        />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 4 }}>{data.title}</Title>
        <Paragraph italic style={{ color: '#888', fontSize: 16, marginBottom: 0 }}>
          {data.titleEn}
        </Paragraph>
      </div>

      {allLessons.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            marginBottom: 18,
          }}
        >
          <StatusFilter value={statusFilter} counts={statusCounts} onChange={setStatusFilter} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                if (learningLessons.length >= 1) setLearnOpen(true)
                else alert(t('basicenglish300.learnEmpty') || '没有学习中状态的句子')
              }}
              style={{
                ...actionButtonStyle,
                opacity: learningLessons.length >= 1 ? 1 : 0.5,
                cursor: learningLessons.length >= 1 ? 'pointer' : 'not-allowed',
              }}
            >
              {t('basicenglish300.learnButton') || '句子学习'}
            </button>
            <button
              onClick={() => {
                if (learningLessons.length >= 1) setQuizOpen(true)
                else alert(t('basicenglish300.quizEmpty') || '学习中的句子不足，无法测验')
              }}
              style={{
                ...actionButtonStyle,
                opacity: learningLessons.length >= 1 ? 1 : 0.5,
                cursor: learningLessons.length >= 1 ? 'pointer' : 'not-allowed',
              }}
            >
              {t('basicenglish300.quizButton') || '测验'}
            </button>
          </div>
        </div>
      )}

      {/* 章节列表 */}
      <Collapse
        defaultActiveKey={[]}
        accordion={false}
        style={{ background: 'transparent', border: 'none' }}
        items={data.chapters.map((chapter, chapterIndex) => {
          const visibleItems = (chapter.items || [])
            .map(i => adaptItem(i))
            .filter(item => {
              if (statusFilter === 'all') return true
              return getWordStatus(withGroup(item, chapter.name)) === statusFilter
            })

          return {
            key: String(chapterIndex),
            label: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' }}>
                <div style={{ minWidth: 0 }}>
                  <Title level={4} style={{ margin: 0 }}>{chapter.name}</Title>
                  <span style={{ color: '#888', fontSize: 13 }}>{chapter.en}</span>
                </div>
                {visibleItems.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShorts({ lessons: visibleItems, chapterName: chapter.name })
                    }}
                    style={{
                      ...actionButtonStyle,
                      padding: '5px 13px',
                      fontSize: 13,
                      alignSelf: 'center',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ▶ 短片
                  </button>
                )}
              </div>
            ),
            children: visibleItems.length === 0 ? (
              <div style={{ padding: '14px 18px', color: '#999', fontSize: 13 }}>
                {t('basicenglish300.filterNoMatch') || '没有符合筛选条件的句子'}
              </div>
            ) : (
              <Card style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, background: '#fff', overflow: 'hidden' }}>
                  {visibleItems.map((item, itemIndex) => {
                    const meta = withGroup(item, chapter.name)
                    const status = getWordStatus(meta)
                    const imageUrl = resolveImageUrl(item.lessonImage)
                    return (
                      <div
                        key={`${chapter.name}-${itemIndex}-${item.en}`}
                        style={
                          isMobile
                            ? {
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                gap: 10,
                                padding: '12px 14px',
                                borderBottom:
                                  itemIndex < visibleItems.length - 1 ? '1px solid #f0f0f0' : 'none',
                              }
                            : {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '10px 14px',
                                borderBottom:
                                  itemIndex < visibleItems.length - 1 ? '1px solid #f0f0f0' : 'none',
                              }
                        }
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.en}
                            style={
                              isMobile
                                ? {
                                    width: '100%',
                                    height: 150,
                                    borderRadius: 6,
                                    objectFit: 'cover',
                                    background: '#f5f5f5',
                                  }
                                : {
                                    width: 96,
                                    height: 96,
                                    borderRadius: 6,
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                    background: '#f5f5f5',
                                  }
                            }
                            onError={(e) => {
                              // 加载失败（404 等）静默隐藏，不破图
                              (e.currentTarget as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div
                            style={
                              isMobile
                                ? { height: 150 }
                                : { width: 96, height: 96, flexShrink: 0 }
                            }
                          />
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            onClick={() => speakOnce(item.name, 'zh-CN')}
                            style={{
                              fontSize: isMobile ? 17 : 15,
                              color: '#222',
                              fontWeight: 500,
                              cursor: item.name ? 'pointer' : 'default',
                              userSelect: 'none',
                            }}
                            title="点击朗读中文"
                          >
                            {item.name}
                          </div>
                          <div
                            onClick={() => speakOnce(item.en, 'en-US')}
                            style={{
                              fontSize: isMobile ? 14 : 13,
                              color: '#666',
                              marginTop: 4,
                              cursor: item.en ? 'pointer' : 'default',
                              userSelect: 'none',
                            }}
                            title="点击朗读英文"
                          >
                            {item.en}
                          </div>
                        </div>

                        <WordStatusButton
                          status={status}
                          progressLoaded={progressLoaded}
                          onClick={() => toggleWordStatus(meta)}
                          style={
                            isMobile
                              ? { width: '100%', marginTop: 2, whiteSpace: 'nowrap' }
                              : { width: 'auto', flexShrink: 0, marginTop: 0, whiteSpace: 'nowrap' }
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </Card>
            ),
          }
        })}
      />

      {/* 子组件：收到的 lessons 已经是适配过的，内部继续读 name/en/lessonImage 即可 */}
      <LessonLearnModal
        lessons={learningLessons}
        open={learnOpen}
        onClose={() => setLearnOpen(false)}
      />

      <LessonQuizModal
        lessons={allLessons.map(x => x.lesson)}
        getLessonStatus={(item) => {
          const found = allLessons.find(x => x.lesson === item)
          return getWordStatus(withGroup(item, found?.chapter.name ?? ''))
        }}
        setLessonStatus={(item, status) => {
          const found = allLessons.find(x => x.lesson === item)
          setWordStatus(withGroup(item, found?.chapter.name ?? ''), status)
        }}
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
      />

      <SentenceShortsModal
        lessons={shorts?.lessons ?? []}
        resolveImageUrl={resolveImageUrl}
        chapterName={shorts?.chapterName}
        open={shorts !== null}
        onClose={() => setShorts(null)}
      />
    </div>
  );
};

export default BasicEnglish300;
