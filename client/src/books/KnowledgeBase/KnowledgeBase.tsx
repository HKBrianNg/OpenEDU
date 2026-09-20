import { useState, useEffect } from 'react';
import { Collapse, Card, Typography, Spin, Image } from 'antd';
import type { KnowledgeIndex, KnowledgeChapter, KnowledgeItem, ChapterContent } from './types';
import { getCourseBaseUrl, getCourseImageUrl } from '../../utils/coursePath';

const { Title, Paragraph } = Typography;

const COURSE_ID = 'KnowledgeBase';

export default function KnowledgeBase() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageTitleEn, setPageTitleEn] = useState('');
  const [chapters, setChapters] = useState<ChapterContent[]>([]);

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
              {items.map((item, i) => (
                <Card
                  key={i}
                  hoverable
                  style={{ borderRadius: 10, border: '1px solid #eee' }}
                >
                  <Title level={5} style={{ marginBottom: 4 }}>
                    {item.title.zh}
                  </Title>
                  <Paragraph
                    italic
                    style={{ color: '#888', fontSize: 13, marginBottom: 14 }}
                  >
                    {item.title.en}
                  </Paragraph>

                  <div
                    style={{
                      background: '#fafafa',
                      borderRadius: 8,
                      padding: 14,
                      marginBottom: item.imageUrl ? 14 : 0,
                    }}
                  >
                    <div style={{ fontSize: 14, lineHeight: 1.8, color: '#333' }}>
                      {item.content.zh}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: '#888',
                        marginTop: 10,
                        borderTop: '1px dashed #e0e0e0',
                        paddingTop: 10,
                      }}
                    >
                      {item.content.en}
                    </div>
                  </div>

                  {item.imageUrl && (
                    <Image
                      src={getCourseImageUrl(COURSE_ID, item.imageUrl)}
                      alt={item.title.zh}
                      style={{ maxWidth: '100%', borderRadius: 6 }}
                      preview={{ mask: '查看大图' }}
                    />
                  )}
                </Card>
              ))}
            </div>
          ),
        }))}
      />
    </div>
  );
}