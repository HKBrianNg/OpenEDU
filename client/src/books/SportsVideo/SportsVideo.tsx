// client/src/books/SportsVideo/SportsVideo.tsx
//
// 体育短片：按项目分章的短视频（当前四个：高尔夫、篮球、足球、健身）。
// 项目列表由 data.json 的 chapters 决定，加减项目只改数据，不动这里。
//
// 跟 EnglishVideo 同一套路子：数据走 coursePath（线上 CDN 或本地 public/data），
// 视频是 YouTube 外链，站内用 iframe 内嵌播放。
// 精简掉了台词、学习、测验、生字表 —— 这里是看动作，不是学语言。
//
// 数据结构（public/data/SportsVideo/）：
//   data.json                chapters[]，contentLink 形如 "Golf.json"
//   {Sport}/{Sport}.json     项目内容 { title, titleEn, description, items: [...] }
//
// 注意：目录名 = contentLink 去掉 ".json"，所以实际路径是 {dir}/{contentLink}。

import { useEffect, useState } from 'react';
import { Alert, Spin, Typography } from 'antd';
import { getCourseAssetUrl, getCourseDataUrl } from '../../utils/coursePath';
import { useLocale } from '../../store/LocaleContext';
import GradeSelector from '../EnglishWord/components/GradeSelector';
import SportCard from './components/SportCard';
import SportWatch from './components/SportWatch';
import type { SportCategoryData, SportIndexData, SportItem } from './types';

const { Title, Text, Paragraph } = Typography;

const COURSE_ID = 'SportsVideo';

/** "Golf.json" → "Golf"（目录名就是去掉扩展名） */
const dirOf = (contentLink: string) => contentLink.replace(/\.json$/i, '');

export default function SportsVideo() {
  const { locale, t } = useLocale();

  const [indexData, setIndexData] = useState<SportIndexData | null>(null);
  const [category, setCategory] = useState<SportCategoryData | null>(null);
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** 非空时进入站内观看页 */
  const [watchItem, setWatchItem] = useState<SportItem | null>(null);

  // 加载项目索引
  useEffect(() => {
    let cancelled = false;
    fetch(getCourseDataUrl(COURSE_ID))
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load index (${res.status})`);
        return res.json();
      })
      .then((data: SportIndexData) => {
        if (cancelled) return;
        setIndexData(data);
        if (data.chapters?.length > 0) {
          setCurrentChapter(data.chapters[0].contentLink);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 切换项目 → 拉该项目内容（路径 {dir}/{contentLink}）
  useEffect(() => {
    if (!currentChapter) return;
    let cancelled = false;

    fetch(getCourseAssetUrl(COURSE_ID, `${dirOf(currentChapter)}/${currentChapter}`))
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${currentChapter} (${res.status})`);
        return res.json();
      })
      .then((data: SportCategoryData) => {
        if (cancelled) return;
        setCategory(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentChapter]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={t('sportsVideo.error') + error} />
      </div>
    );
  }

  // 当前集在列表里的位置 —— 用来显示「3 / 11」并给上一集/下一集
  const list = category?.items || [];
  const watchIndex = watchItem ? list.findIndex((it) => it.id === watchItem.id) : -1;

  if (watchItem) {
    return (
      <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
        <SportWatch
          item={watchItem}
          index={watchIndex >= 0 ? watchIndex + 1 : undefined}
          total={list.length || undefined}
          onPrev={watchIndex > 0 ? () => setWatchItem(list[watchIndex - 1]) : undefined}
          onNext={
            watchIndex >= 0 && watchIndex < list.length - 1
              ? () => setWatchItem(list[watchIndex + 1])
              : undefined
          }
          onBack={() => setWatchItem(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          {indexData?.title || t('sportsVideo.title')}
        </Title>
        <Text type="secondary" style={{ fontSize: 15 }}>
          {indexData?.titleEn}
        </Text>
      </div>

      {/* 七个项目就是七个「年级」，选择器是通用的，直接复用 */}
      {indexData && (
        <GradeSelector
          chapters={indexData.chapters}
          currentChapter={currentChapter}
          onSelect={(link) => {
            setLoading(true);
            setError(null);
            setCurrentChapter(link);
          }}
        />
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
          <div style={{ marginTop: 12, color: '#999' }}>{t('sportsVideo.loading')}</div>
        </div>
      )}

      {!loading && category && (
        <>
          <div style={{ marginBottom: 18 }}>
            <Title level={3} style={{ marginBottom: 4 }}>
              {locale === 'zh' ? category.title : category.titleEn || category.title}
            </Title>
            <Paragraph style={{ color: '#666', marginBottom: 0, fontSize: 14 }}>
              {locale === 'zh'
                ? category.description
                : category.descriptionEn || category.description}
            </Paragraph>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {(category.items || []).map((item) => (
              <SportCard key={item.id} item={item} onWatch={setWatchItem} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
