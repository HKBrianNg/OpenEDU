import React, { useEffect, useState } from 'react';
import { Card, Typography, Collapse, Modal, Spin, Button, Space } from 'antd';
import { getCourseBaseUrl, getCourseDataUrl } from '../../utils/coursePath';
import type { BasicEnglishData, LessonItem } from './types';

const { Title, Paragraph } = Typography;

const COURSE_ID = 'BasicEnglish300';

async function safeJsonFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `HTTP ${res.status} ${res.statusText} for ${url}. ` +
        (text ? `Response starts with: ${text.slice(0, 200)}` : '')
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(
      `Expected JSON from ${url}, but got content-type: "${contentType}". ` +
        `Body starts with: ${text.slice(0, 300)}`
    );
  }

  return (await res.json()) as T;
}

const BasicEnglish300: React.FC = () => {
  const [data, setData] = useState<BasicEnglishData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<LessonItem | null>(null);

  // 语音朗读状态
  const [highlightedSentenceIndex, setHighlightedSentenceIndex] = useState<number>(-1);
  const [sentences, setSentences] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingLang, setSpeakingLang] = useState<'cn' | 'en' | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // ── 语音朗读 ──
  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setHighlightedSentenceIndex(-1);
    setIsSpeaking(false);
    setSpeakingLang(null);
    setIsPaused(false);
  };

  const togglePauseResume = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const speakText = (text?: string, lang?: string) => {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
      console.warn('当前浏览器不支持语音朗读');
      return;
    }

    stopSpeech();

    // 按句子切分
    const splitSentences = text
      .replace(/\n\n/g, '【PARA】')
      .split(/(?<=[。！？.!?])/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .flatMap(s => s.split('【PARA】'));

    setSentences(splitSentences);
    setHighlightedSentenceIndex(-1);
    setIsSpeaking(true);
    setSpeakingLang(lang === 'zh-CN' ? 'cn' : 'en');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || 'en-US';
    utterance.rate = 0.7;
    utterance.pitch = 1;
    utterance.volume = 1;

    const sentenceStartIndices: number[] = [];
    let accumulatedLength = 0;
    splitSentences.forEach((sentence) => {
      sentenceStartIndices.push(accumulatedLength);
      accumulatedLength += sentence.length;
    });

    utterance.onboundary = (event) => {
      if (event.name === 'word' || event.name === 'sentence') {
        const currentCharIndex = event.charIndex;
        let idx = sentenceStartIndices.length - 1;
        for (let i = 0; i < sentenceStartIndices.length; i++) {
          if (currentCharIndex >= sentenceStartIndices[i]) {
            idx = i;
          } else {
            break;
          }
        }
        setHighlightedSentenceIndex(idx);
      }
    };

    utterance.onend = () => {
      setHighlightedSentenceIndex(-1);
      setIsSpeaking(false);
      setSpeakingLang(null);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setHighlightedSentenceIndex(-1);
      setIsSpeaking(false);
      setSpeakingLang(null);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleReadEnglish = () => {
    speakText(currentLesson?.en, 'en-US');
  };

  const handleReadChinese = () => {
    speakText(currentLesson?.name, 'zh-CN');
  };

  // 组件卸载时停止朗读
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ── 数据加载 ──
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);

    const dataUrl = getCourseDataUrl(COURSE_ID);

    safeJsonFetch<BasicEnglishData>(dataUrl)
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
        console.error('Failed to load data:', err);
        if (err instanceof Error) {
          setLoadError(err.message);
        } else {
          setLoadError('数据加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── 弹窗操作 ──
  const handleViewLesson = (item: LessonItem) => {
    setCurrentLesson(item);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    stopSpeech();
    setModalVisible(false);
    setCurrentLesson(null);
  };

  // ── 图片 URL 解析 ──
  const resolveImageUrl = (lessonImage?: string): string | undefined => {
    if (!lessonImage) return undefined;
    if (/^https?:\/\//.test(lessonImage)) return lessonImage;

    const base = getCourseBaseUrl(COURSE_ID);
    const clean = lessonImage.replace(/^\/+/, '');
    return `${base}/content/${clean}`;
  };

  // ── 渲染高亮文本 ──
  const renderHighlightedText = (
    text: string,
    lang: 'cn' | 'en',
    fontSize: number,
    lineHeight: number,
    color: string
  ) => {
    if (isSpeaking && speakingLang === lang && sentences.length > 0) {
      return (
        <div style={{ fontSize, lineHeight, color }}>
          {sentences.map((sentence, index) => (
            <span
              key={index}
              style={{
                backgroundColor:
                  index === highlightedSentenceIndex ? '#fff3b0' : 'transparent',
                transition: 'background-color 0.2s ease',
                borderRadius: 2,
                padding: '0 2px',
              }}
            >
              {sentence}
            </span>
          ))}
        </div>
      );
    }

    return (
      <Paragraph style={{ fontSize, lineHeight, color, marginBottom: 0 }}>
        {text}
      </Paragraph>
    );
  };

  // ── 加载状态 ──
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

  // ── 主渲染 ──
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          {data.title}
        </Title>
        <Paragraph italic style={{ color: '#888', fontSize: 16, marginBottom: 0 }}>
          {data.titleEn}
        </Paragraph>
      </div>

      {/* ── 章节列表 ── */}
      <Collapse
        defaultActiveKey={[]}
        accordion={false}
        style={{ background: 'transparent', border: 'none' }}
        items={data.chapters.map((chapter, chapterIndex) => ({
          key: String(chapterIndex),
          label: (
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {chapter.name}
              </Title>
              <span style={{ color: '#888', fontSize: 13 }}>{chapter.en}</span>
            </div>
          ),
          children: (
            <Card style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <div
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 6,
                  background: '#fff',
                  overflow: 'hidden',
                }}
              >
                {chapter.items.map((item, itemIndex) => (
                  <div
                    key={item.lessonImage || itemIndex}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom:
                        itemIndex < chapter.items.length - 1
                          ? '1px solid #f0f0f0'
                          : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                        {item.en}
                      </div>
                    </div>

                    <a
                      onClick={() => handleViewLesson(item)}
                      style={{
                        color: '#1677ff',
                        fontSize: 14,
                        flexShrink: 0,
                        marginLeft: 12,
                      }}
                    >
                      查看详情
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          ),
        }))}
      />

      {/* ── 详情弹窗 ── */}
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingRight: 36,
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>详细内容</span>
            {currentLesson && (
              <Space size="small">
                <Button
                  size="small"
                  type="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReadEnglish();
                  }}
                  disabled={!currentLesson.en}
                >
                  Eng
                </Button>
                <Button
                  size="small"
                  type="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReadChinese();
                  }}
                  disabled={!currentLesson.name}
                >
                  中文
                </Button>
                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopSpeech();
                  }}
                >
                  停止
                </Button>
                {isPaused && (
                  <span style={{ color: '#1677ff', fontSize: 13 }}>
                    ⏸ 已暂停
                  </span>
                )}
              </Space>
            )}
          </div>
        }
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={680}
        destroyOnHidden
      >
        {currentLesson ? (
          <div
            style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 6 }}
            onClick={togglePauseResume}
          >
            {/* 图片 */}
            {currentLesson.lessonImage && (
              <div
                style={{ textAlign: 'center', marginBottom: 16 }}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={resolveImageUrl(currentLesson.lessonImage)}
                  alt={currentLesson.en}
                  style={{ maxWidth: '100%', borderRadius: 8 }}
                  onError={(e) => {
                    console.error(
                      '图片加载失败:',
                      currentLesson.lessonImage,
                      '=>',
                      resolveImageUrl(currentLesson.lessonImage)
                    );
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* 中文内容 - 带高亮 */}
            <div style={{ marginBottom: 12 }}>
              {renderHighlightedText(
                currentLesson.name,
                'cn',
                18,
                1.9,
                '#222'
              )}
            </div>

            {/* 英文内容 - 带高亮 */}
            <div>
              {renderHighlightedText(
                currentLesson.en,
                'en',
                17,
                1.8,
                '#555'
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>
            无内容
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BasicEnglish300;