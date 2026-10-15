// client/src/books/BasicEnglish300/BasicEnglish300.tsx
//
// 300 句基础英语：
//   - 状态切换（pending / learning / mastered）
//   - 状态过滤
//   - 句子学习（翻卡）
//   - 三卷测验（听音选句 / 认句选义 / 拼写首词）
//   - 进度同步（download / upload）
//   - 列表行内显示图片，句子点击即朗读

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, Collapse, Spin, Button } from 'antd';
import { getCourseBaseUrl, getCourseDataUrl } from '../../utils/coursePath';
import { safeJsonFetch } from '../../utils/safeFetch';
import { useLocale } from '../../store/LocaleContext';
import { useAuth } from '../../store/AuthContext';
import { useProgress } from '../EnglishWord/hooks/useProgress';
import WordStatusButton from '../EnglishWord/components/WordStatusButton';
import StatusFilter, { type StatusFilterValue } from '../EnglishWord/components/StatusFilter';
import ProgressButtons from '../EnglishWord/components/ProgressButtons';
import type { BasicEnglishData } from './types';
import LessonLearnModal from './components/LessonLearnModal';
import LessonQuizModal from './components/LessonQuizModal';

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

/** 简单一句即读：停止当前朗读后开始新的（不维护高亮等状态机） */
function speakOnce(text: string | undefined, lang: 'en-US' | 'zh-CN'): void {
  if (!text) return;
  if (!('speechSynthesis' in window)) {
    console.warn('当前浏览器不支持语音朗读');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

const BasicEnglish300: React.FC<BasicEnglish300Props> = ({ onExit }) => {
  const { t } = useLocale();
  const { user, token, isAuthenticated } = useAuth();
  const [data, setData] = useState<BasicEnglishData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 弹窗状态
  const [learnOpen, setLearnOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');

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

  // 数据加载
  useEffect(() => {
    let cancelled = false;
    // 初始 state 已是 loading=true / error=null；不在 effect 里再设一次避免级联渲染

    safeJsonFetch<BasicEnglishData>(getCourseDataUrl(COURSE_ID))
      .then((json) => {
        if (cancelled) return;
        if (!json.chapters || json.chapters.length === 0) {
          setLoadError('数据为空或格式不匹配');
          return;
        }
        setData(json);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof Error) setLoadError(err.message);
        else setLoadError('数据加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // 组件卸载时停止朗读，避免组件已卸载但 TTS 还在播
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 图片 URL 解析
  const resolveImageUrl = (lessonImage?: string): string | undefined => {
    if (!lessonImage) return undefined;
    if (/^https?:\/\//.test(lessonImage)) return lessonImage;
    const base = getCourseBaseUrl(COURSE_ID);
    return `${base}/content/${lessonImage.replace(/^\/+/, '')}`;
  };

  // 状态统计与过滤
  const allLessons = useMemo(() => {
    if (!data) return []
    return data.chapters.flatMap(c => c.items.map(i => ({ lesson: i, chapter: c })))
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

  const learningLessons = useMemo(
    () => allLessons
      .filter(({ lesson, chapter }) => getWordStatus(withGroup(lesson, chapter.name)) === 'learning')
      .map(x => x.lesson),
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
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      {/* 顶部：返回 + 进度同步 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {onExit && (
          <Button
            onClick={onExit}
            style={{
              borderRadius: 99,
              border: '1px solid #d0d0d0',
              background: '#fff',
              color: '#333',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← {t('basicenglish300.backToLobby') || '返回大厅'}
          </Button>
        )}
        <ProgressButtons
          isAuthenticated={isAuthenticated}
          progressLoaded={progressLoaded}
          syncing={syncing}
          onDownload={downloadProgress}
          onUpload={uploadProgress}
        />
      </div>

      {/* 标题 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 4 }}>{data.title}</Title>
        <Paragraph italic style={{ color: '#888', fontSize: 16, marginBottom: 0 }}>
          {data.titleEn}
        </Paragraph>
      </div>

      {/* 状态过滤 + 学习/测验按钮 */}
      {allLessons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
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
        defaultActiveKey={data.chapters.map((_, i) => String(i))}
        accordion={false}
        style={{ background: 'transparent', border: 'none' }}
        items={data.chapters.map((chapter, chapterIndex) => {
          const visibleItems = chapter.items.filter(item => {
            if (statusFilter === 'all') return true
            return getWordStatus(withGroup(item, chapter.name)) === statusFilter
          })
          return {
            key: String(chapterIndex),
            label: (
              <div>
                <Title level={4} style={{ margin: 0 }}>{chapter.name}</Title>
                <span style={{ color: '#888', fontSize: 13 }}>{chapter.en}</span>
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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 14px',
                          borderBottom: itemIndex < visibleItems.length - 1 ? '1px solid #f0f0f0' : 'none',
                        }}
                      >
                        {/* 缩略图：固定 96×96，object-fit: cover */}
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.en}
                            style={{
                              width: 96,
                              height: 96,
                              borderRadius: 6,
                              objectFit: 'cover',
                              flexShrink: 0,
                              background: '#f5f5f5',
                            }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div style={{ width: 96, height: 96, flexShrink: 0 }} />
                        )}

                        {/* 句子区：中文 + 英文，悬停高亮，cursor:pointer 表明可点 */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            onClick={() => speakOnce(item.name, 'zh-CN')}
                            style={{
                              fontSize: 15,
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
                              fontSize: 13,
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

                        {/* 状态切换按钮 */}
                        <WordStatusButton
                          status={status}
                          progressLoaded={progressLoaded}
                          onClick={() => toggleWordStatus(meta)}
                          style={{ width: 'auto', flexShrink: 0, marginTop: 0, whiteSpace: 'nowrap' }}
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

      {/* 句子学习弹窗 */}
      <LessonLearnModal
        lessons={learningLessons}
        open={learnOpen}
        onClose={() => setLearnOpen(false)}
      />

      {/* 测验弹窗 */}
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
    </div>
  );
};

export default BasicEnglish300;
