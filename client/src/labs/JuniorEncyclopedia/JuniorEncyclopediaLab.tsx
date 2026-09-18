import React, { useEffect, useState } from 'react';
import { Card, Typography, Collapse, Modal, Spin, Button, Space } from 'antd';
import {
  getCourseBaseUrl,
  getCourseDataUrl,
  getCourseContentUrl,
} from '../../utils/coursePath';

const { Title, Paragraph } = Typography;

type ItemContent = {
  contentCn?: string;
  contentEn?: string;
  imageLink?: string;
};

type TocItem = {
  name: string;
  en: string;
  contentLink: string;
};

type TocSection = {
  name: string;
  en: string;
  descriptionCn?: string;
  descriptionEn?: string;
  items: TocItem[];
};

type TocChapter = {
  name: string;
  en: string;
  descriptionCn?: string;
  descriptionEn?: string;
  sections: TocSection[];
};

type EncyclopediaData = {
  title: string;
  titleEn: string;
  chapters: TocChapter[];
};

const COURSE_ID = 'JuniorEncyclopedia';

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

const JuniorEncyclopediaLab: React.FC = () => {
  const [data, setData] = useState<EncyclopediaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [currentContent, setCurrentContent] = useState<ItemContent | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  // 语音朗读状态
  const [highlightedSentenceIndex, setHighlightedSentenceIndex] = useState<number>(-1);
  const [sentences, setSentences] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingLang, setSpeakingLang] = useState<'cn' | 'en' | null>(null);

  // ── 语音朗读 ──
  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setHighlightedSentenceIndex(-1);
    setIsSpeaking(false);
    setSpeakingLang(null);
  };

  const speakText = (text?: string, lang?: string) => {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
      console.warn('当前浏览器不支持语音朗读');
      return;
    }

    stopSpeech();

    // 按句子切分（中文按 。！？，英文按 .!?）
    const splitSentences = text.split(/(?<=[。！？.!?\n])/).filter(s => s.trim());
    setSentences(splitSentences);
    setHighlightedSentenceIndex(-1);
    setIsSpeaking(true);
    setSpeakingLang(lang === 'zh-CN' ? 'cn' : 'en');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    // 计算每个句子的起始 charIndex
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
    };

    utterance.onerror = () => {
      setHighlightedSentenceIndex(-1);
      setIsSpeaking(false);
      setSpeakingLang(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleReadEnglish = () => {
    speakText(currentContent?.contentEn, 'en-US');
  };

  const handleReadChinese = () => {
    speakText(currentContent?.contentCn, 'zh-CN');
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

    safeJsonFetch<EncyclopediaData>(dataUrl)
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

  // ── 内容加载 ──
  const handleViewContent = async (item: TocItem) => {
    setModalVisible(true);
    setContentLoading(true);
    setContentError(null);
    setCurrentContent(null);

    try {
      const contentUrl = getCourseContentUrl(COURSE_ID, item.contentLink);
      const content = await safeJsonFetch<ItemContent>(contentUrl);
      setCurrentContent(content);
    } catch (err: unknown) {
      console.error('Failed to load content:', err);
      if (err instanceof Error) {
        setContentError(err.message);
      } else {
        setContentError('内容加载失败');
      }
    } finally {
      setContentLoading(false);
    }
  };

  const handleCloseModal = () => {
    stopSpeech();
    setModalVisible(false);
    setCurrentContent(null);
    setContentError(null);
  };

  // ── 图片 URL 解析 ──
  const resolveImageUrl = (imageLink?: string): string | undefined => {
    if (!imageLink) return undefined;
    if (/^https?:\/\//.test(imageLink)) return imageLink;

    const base = getCourseBaseUrl(COURSE_ID);
    const clean = imageLink.replace(/^\/+/, '');
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

      {data.chapters.map((chapter, chapterIndex) => (
        <Card
          key={chapterIndex}
          title={
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {chapter.name}
              </Title>
              <span style={{ color: '#888', fontSize: 13 }}>{chapter.en}</span>
            </div>
          }
          style={{ marginBottom: 20, borderRadius: 8 }}
        >
          {chapter.descriptionCn && (
            <Paragraph style={{ fontSize: 14, color: '#444', marginBottom: 4 }}>
              {chapter.descriptionCn}
            </Paragraph>
          )}
          {chapter.descriptionEn && (
            <Paragraph style={{ fontSize: 13, color: '#999', marginBottom: 14 }}>
              {chapter.descriptionEn}
            </Paragraph>
          )}

          <Collapse
            accordion
            expandIconPlacement="end"
            style={{ background: '#fafafa' }}
            items={chapter.sections.map((section, sectionIndex) => ({
              key: sectionIndex,
              label: (
                <div>
                  <strong style={{ fontSize: 15 }}>{section.name}</strong>
                  <span
                    style={{
                      marginLeft: 8,
                      color: '#888',
                      fontWeight: 'normal',
                      fontSize: 13,
                    }}
                  >
                    {section.en}
                  </span>
                </div>
              ),
              children: (
                <>
                  {section.descriptionCn && (
                    <Paragraph style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>
                      {section.descriptionCn}
                    </Paragraph>
                  )}
                  {section.descriptionEn && (
                    <Paragraph style={{ fontSize: 13, color: '#999', marginBottom: 10 }}>
                      {section.descriptionEn}
                    </Paragraph>
                  )}

                  <div
                    style={{
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                      background: '#fff',
                      overflow: 'hidden',
                    }}
                  >
                    {section.items.map((item, itemIndex) => (
                      <div
                        key={item.contentLink || itemIndex}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderBottom:
                            itemIndex < section.items.length - 1
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
                          onClick={() => handleViewContent(item)}
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
                </>
              ),
            }))}
          />
        </Card>
      ))}

      {/* ── 详情弹窗 ── */}
      <Modal
        title="详细内容"
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={680}
        destroyOnHidden
      >
        {contentLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin description="加载内容中..." />
          </div>
        ) : contentError ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#d93025' }}>
            <p>内容加载失败</p>
            <p style={{ fontSize: 13 }}>{contentError}</p>
          </div>
        ) : currentContent ? (
          <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 6 }}>
            {/* 朗读按钮 */}
            <Space style={{ marginBottom: 12 }}>
              <Button
                size="small"
                type="primary"
                onClick={handleReadEnglish}
                disabled={!currentContent.contentEn}
              >
                Read English
              </Button>
              <Button
                size="small"
                type="primary"
                onClick={handleReadChinese}
                disabled={!currentContent.contentCn}
              >
                读中文
              </Button>
              <Button size="small" onClick={stopSpeech}>
                停止
              </Button>
            </Space>

            {/* 图片 */}
            {currentContent.imageLink && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img
                  src={resolveImageUrl(currentContent.imageLink)}
                  alt="插图"
                  style={{ maxWidth: '100%', borderRadius: 8 }}
                  onError={(e) => {
                    console.error(
                      '图片加载失败:',
                      currentContent.imageLink,
                      '=>',
                      resolveImageUrl(currentContent.imageLink)
                    );
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* 中文内容 - 带高亮 */}
            <div style={{ marginBottom: 12 }}>
              {renderHighlightedText(
                currentContent.contentCn || '',
                'cn',
                15,
                1.9,
                '#222'
              )}
            </div>

            {/* 英文内容 - 带高亮 */}
            <div>
              {renderHighlightedText(
                currentContent.contentEn || '',
                'en',
                14,
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

export default JuniorEncyclopediaLab;