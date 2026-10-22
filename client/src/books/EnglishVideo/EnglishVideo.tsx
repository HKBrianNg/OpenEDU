// client/src/books/EnglishVideo/EnglishVideo.tsx
//
// 看短片学英文：
//   - 按年级挑短片（幼稚园 → 中学一年级）
//   - 每个年级按来源网站分组（B站 / CBeebies 官网）
//   - 有台词的片子可以「学习」（中英对照 + 朗读）和「测验」（台词填空）；
//     没有台词就只有信息 + 去观看
//
// 数据结构（public/data/EnglishVideo/）：
//   data.json                        chapters[]，contentLink 形如 "Kingdergarten.json"
//   {Grade}/{Grade}.json             年级内容，items[] 里带 transcriptFile
//   {Grade}/transcripts/*.json       台词 { lines: [{ index, start, en, zh }] }
//
// 注意：目录名 = contentLink 去掉 ".json"，所以实际路径是 {dir}/{contentLink}。

import { useEffect, useState } from 'react';
import { Alert, Spin, Typography } from 'antd';
import { getCourseAssetUrl, getCourseDataUrl } from '../../utils/coursePath';
import { useLocale } from '../../store/LocaleContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import GradeSelector from '../EnglishWord/components/GradeSelector';
import VideoCard from './components/VideoCard';
import LearningModal from './components/LearningModal';
import ClozePractice from './components/ClozePractice';
import type {
  TranscriptFile,
  TranscriptLine,
  VideoGradeData,
  VideoIndexData,
  VideoItem,
} from './types';

const { Title, Text, Paragraph } = Typography;

const COURSE_ID = 'EnglishVideo';

/** "Kingdergarten.json" → "Kingdergarten"（目录名就是去掉扩展名） */
const dirOf = (contentLink: string) => contentLink.replace(/\.json$/i, '');

interface EnglishVideoProps {
  onExit?: () => void;
}

export default function EnglishVideo({ onExit }: EnglishVideoProps) {
  const { locale, t } = useLocale();
  const isMobile = useIsMobile();

  const [indexData, setIndexData] = useState<VideoIndexData | null>(null);
  const [grade, setGrade] = useState<VideoGradeData | null>(null);
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 台词缓存，key = `${dir}-${itemId}`，避免不同年级的 id 冲突 */
  const [transcripts, setTranscripts] = useState<Map<string, TranscriptLine[]>>(new Map());
  const [learnItem, setLearnItem] = useState<VideoItem | null>(null);
  const [quizItem, setQuizItem] = useState<VideoItem | null>(null);

  const dir = currentChapter ? dirOf(currentChapter) : '';

  // 加载年级索引
  useEffect(() => {
    let cancelled = false;
    fetch(getCourseDataUrl(COURSE_ID))
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load index (${res.status})`);
        return res.json();
      })
      .then((data: VideoIndexData) => {
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

  // 切换年级 → 拉取该年级内容（路径 {dir}/{contentLink}）
  useEffect(() => {
    if (!currentChapter) return;
    let cancelled = false;

    fetch(getCourseAssetUrl(COURSE_ID, `${dirOf(currentChapter)}/${currentChapter}`))
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${currentChapter} (${res.status})`);
        return res.json();
      })
      .then((data: VideoGradeData) => {
        if (cancelled) return;
        setGrade(data);
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

  // 年级内容到位后，预载该年级所有台词 —— 这样才能在卡片上准确判断
  // "transcript 为空 → 不显示学习和测验"
  useEffect(() => {
    if (!grade || !dir) return;
    let cancelled = false;

    const targets = grade.categories.flatMap((c) => c.items).filter((it) => it.transcriptFile);

    Promise.all(
      targets.map(async (it) => {
        const key = `${dir}-${it.id}`;
        try {
          const res = await fetch(getCourseAssetUrl(COURSE_ID, `${dir}/${it.transcriptFile}`));
          if (!res.ok) return [key, [] as TranscriptLine[]] as const;
          const json: TranscriptFile = await res.json();
          return [key, (json.lines || []).filter((l) => l.en)] as const;
        } catch {
          return [key, [] as TranscriptLine[]] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) setTranscripts(new Map(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [grade, dir]);

  const handleSelectGrade = (contentLink: string) => {
    setLoading(true);
    setError(null);
    setCurrentChapter(contentLink);
  };

  const linesOf = (item: VideoItem | null) =>
    item ? transcripts.get(`${dir}-${item.id}`) || [] : [];

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={t('englishVideo.error') + error} />
      </div>
    );
  }

  const backButton = onExit ? (
    <button
      onClick={onExit}
      style={{
        borderRadius: 99,
        border: '1px solid #d0d0d0',
        background: '#fff',
        color: '#333',
        cursor: 'pointer',
        padding: '6px 16px',
        fontSize: 14,
        whiteSpace: 'nowrap',
        // 宽屏贴标题右侧；窄屏标题会顶到按钮，退回标题上方居中
        ...(isMobile ? { marginBottom: 12 } : { position: 'absolute', right: 0, top: 0 }),
      }}
    >
      ← {t('englishVideo.backToLobby')}
    </button>
  ) : null;

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ position: 'relative', textAlign: 'center', marginBottom: 18 }}>
        {backButton}
        <Title level={2} style={{ marginBottom: 4 }}>
          {indexData?.title || t('englishVideo.title')}
        </Title>
        <Text type="secondary" style={{ fontSize: 15 }}>
          {indexData?.titleEn}
        </Text>
      </div>

      {indexData && (
        <GradeSelector
          chapters={indexData.chapters}
          currentChapter={currentChapter}
          onSelect={handleSelectGrade}
        />
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
          <div style={{ marginTop: 12, color: '#999' }}>{t('englishVideo.loading')}</div>
        </div>
      )}

      {!loading && grade && (
        <>
          <div style={{ marginBottom: 18 }}>
            <Title level={3} style={{ marginBottom: 4 }}>
              {locale === 'zh' ? grade.title : grade.titleEn || grade.title}
            </Title>
            <Paragraph style={{ color: '#666', marginBottom: 0, fontSize: 14 }}>
              {locale === 'zh' ? grade.description : grade.descriptionEn || grade.description}
            </Paragraph>
          </div>

          {grade.categories.map((cat) => (
            <div key={cat.name} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Title level={4} style={{ margin: 0 }}>
                  {locale === 'zh' ? cat.name : cat.en || cat.name}
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {cat.items.length}
                </Text>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 14,
                }}
              >
                {cat.items.map((item) => (
                  <VideoCard
                    key={`${cat.name}-${item.id}`}
                    item={item}
                    hasTranscript={linesOf(item).length > 0}
                    onLearn={setLearnItem}
                    onQuiz={setQuizItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      <LearningModal
        item={learnItem}
        lines={linesOf(learnItem)}
        open={Boolean(learnItem)}
        onClose={() => setLearnItem(null)}
      />
      <ClozePractice
        item={quizItem}
        lines={linesOf(quizItem)}
        open={Boolean(quizItem)}
        onClose={() => setQuizItem(null)}
      />
    </div>
  );
}
