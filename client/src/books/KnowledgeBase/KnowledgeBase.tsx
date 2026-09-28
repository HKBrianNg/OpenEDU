import { useState, useEffect, useRef, useCallback } from 'react';
import { Collapse, Card, Typography, Spin, Image, message } from 'antd';
import type { KnowledgeIndex, KnowledgeChapter, KnowledgeItem, ChapterContent } from './types';
import { getCourseBaseUrl } from '../../utils/coursePath';

const { Title, Paragraph } = Typography;

const COURSE_ID = 'KnowledgeBase';

const supportsTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;

export default function KnowledgeBase() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageTitleEn, setPageTitleEn] = useState('');
  const [chapters, setChapters] = useState<ChapterContent[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
    utteranceRef.current = null;
  }, []);

  const speak = useCallback((text: string, lang: string, id: string) => {
    if (!supportsTTS) {
      message.warning('您的浏览器不支持语音朗读');
      return;
    }

    if (speakingId === id) {
      stopSpeaking();
      return;
    }

    if (speakingId) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onend = () => {
      setSpeakingId(null);
      utteranceRef.current = null;
    };

    utterance.onerror = () => {
      setSpeakingId(null);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }, [speakingId, stopSpeaking]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const baseUrl = getCourseBaseUrl(COURSE_ID);

        const indexRes = await fetch(`${baseUrl}/data.json`);
        if (!indexRes.ok) throw new Error(`加载索引失败: HTTP ${indexRes.status}`);
        const index: KnowledgeIndex = await indexRes.json();

        if (cancelled) return;

        setPageTitle(index.title || '知识库');
        setPageTitleEn(index.titleEn || 'Knowledge Base');

        const results = await Promise.all(
          index.chapters.map(async (chapter: KnowledgeChapter) => {
            const contentRes = await fetch(`${baseUrl}/content/${chapter.contentLink}`);
            if (!contentRes.ok) {
              console.warn(`加载章节 ${chapter.name} 失败`);
              return { chapter, items: [] };
            }
            const data = await contentRes.json();
            return { chapter, items: data as KnowledgeItem[] };
          })
        );

        if (cancelled) return;
        setChapters(results);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : '加载失败';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#999' }}>加载知识库...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: '#d93025', textAlign: 'center' }}>
        <h3>加载失败</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <Title level={2} style={{ marginBottom: 4 }}>{pageTitle}</Title>
        <Paragraph italic style={{ color: '#888', fontSize: 16, margin: 0 }}>
          {pageTitleEn}
        </Paragraph>
      </div>

      <Collapse
        defaultActiveKey={[]}
        accordion={false}
        style={{ background: 'transparent', border: 'none' }}
        items={chapters.map(({ chapter, items }, idx) => ({
          key: String(idx),
          label: (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 600 }}>{chapter.name}</span>
              <span style={{ color: '#aaa', fontSize: 13 }}>{chapter.en}</span>
            </div>
          ),
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {items.length === 0 && (
                <div style={{ color: '#999', textAlign: 'center', padding: 24 }}>
                  暂无内容
                </div>
              )}
              {items.map((item, i) => {
                const zhId = `zh-${idx}-${i}`;
                const enId = `en-${idx}-${i}`;
                const imageSrc = item.imageUrl
                  ? `${getCourseBaseUrl(COURSE_ID)}/content/${item.imageUrl.replace(/^\/+/, '')}`
                  : undefined;

                return (
                  <Card key={i} hoverable style={{ borderRadius: 10, border: '1px solid #eee' }}>
                    <Title level={5} style={{ marginBottom: 4 }}>
                      {item.title.zh}
                    </Title>
                    <Paragraph italic style={{ color: '#888', fontSize: 13, marginBottom: 14 }}>
                      {item.title.en}
                    </Paragraph>

                    <div
                      onClick={() => speak(item.content.zh, 'zh-CN', zhId)}
                      style={{
                        background: speakingId === zhId ? '#e6f7ff' : '#fafafa',
                        borderRadius: 8,
                        padding: 14,
                        marginBottom: imageSrc ? 14 : 0,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        border: speakingId === zhId ? '1px solid #91d5ff' : '1px solid transparent',
                      }}
                      title="点击朗读中文"
                    >
                      <div style={{ fontSize: 14, lineHeight: 1.8, color: '#333' }}>
                        {item.content.zh}
                      </div>
                      {speakingId === zhId && (
                        <span style={{ fontSize: 11, color: '#1890ff', marginTop: 4, display: 'inline-block' }}>
                          🔊 朗读中...
                        </span>
                      )}
                    </div>

                    <div
                      onClick={() => speak(item.content.en, 'en-US', enId)}
                      style={{
                        background: speakingId === enId ? '#fff7e6' : '#fafafa',
                        borderRadius: 8,
                        padding: 14,
                        marginBottom: imageSrc ? 14 : 0,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        border: speakingId === enId ? '1px solid #ffd591' : '1px solid transparent',
                        marginTop: 8,
                      }}
                      title="Click to read aloud"
                    >
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#888' }}>
                        {item.content.en}
                      </div>
                      {speakingId === enId && (
                        <span style={{ fontSize: 11, color: '#fa8c16', marginTop: 4, display: 'inline-block' }}>
                          🔊 Reading...
                        </span>
                      )}
                    </div>

                    {imageSrc && (
                      <Image
                        src={imageSrc}
                        alt={item.title.zh}
                        style={{ maxWidth: '100%', borderRadius: 6 }}
                        preview={{ mask: '查看大图' }}
                        fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjE0Ij7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+"
                      />
                    )}
                  </Card>
                );
              })}
            </div>
          ),
        }))}
      />
    </div>
  );
}