// desktop/src/pages/english/EnglishVideo/index.tsx

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Spin, Typography } from 'antd';
import { getCourseAssetUrl, getCourseDataUrl } from '../../../utils/coursePath';
import { useLocale } from '../../../store/LocaleContext';
import GradeSelector from '../EnglishWord/components/GradeSelector';
import VideoCard from './components/VideoCard';
import LearningModal from './components/LearningModal';
import ClozePractice from './components/ClozePractice';
import VideoWatch from './components/VideoWatch';
import VocabularyModal from './components/VocabularyModal';
import VocabularyPage from './components/VocabularyPage';
import { useVocabulary } from './hooks/useVocabulary';
import type {
  TranscriptFile,
  TranscriptLine,
  VideoGradeData,
  VideoIndexData,
  VideoItem,
} from './types';
import './englishVideo.css';

const { Title, Text, Paragraph } = Typography;

const COURSE_ID = 'EnglishVideo';

/** "Kingdergarten.json" → "Kingdergarten"（目录名就是去掉扩展名） */
const dirOf = (contentLink: string) => contentLink.replace(/\.json$/i, '');

export function EnglishVideo() {
  const { locale, t } = useLocale();

  const [indexData, setIndexData] = useState<VideoIndexData | null>(null);
  const [grade, setGrade] = useState<VideoGradeData | null>(null);
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 台词缓存，key = `${dir}-${itemId}` */
  const [transcripts, setTranscripts] = useState<Map<string, TranscriptLine[]>>(new Map());
  const [learnItem, setLearnItem] = useState<VideoItem | null>(null);
  const [quizItem, setQuizItem] = useState<VideoItem | null>(null);
  /** 非空时进入站内观看页 */
  const [watchItem, setWatchItem] = useState<VideoItem | null>(null);
  /** 非空时打开该集生字表 */
  const [vocabItem, setVocabItem] = useState<VideoItem | null>(null);
  /** 总生字表页 */
  const [vocabAllOpen, setVocabAllOpen] = useState(false);

  const dir = currentChapter ? dirOf(currentChapter) : '';

  const { words: vocabWords, loading: vocabLoading } = useVocabulary(dir);
  const glossedCount = vocabWords.filter((w) => w.zh).length;

  // 加载年级索引
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // 切换年级 → 拉取该年级内容
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

    return () => { cancelled = true; };
  }, [currentChapter]);

  // 预载该年级所有台词
  useEffect(() => {
    if (!grade || !dir) return;
    let cancelled = false;

    const targets = (grade.items || []).filter((it) => it.transcriptFile);

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
      if (cancelled) return;
      setTranscripts(new Map(entries));
    });

    return () => { cancelled = true; };
  }, [grade, dir]);

  // 按 series 分组
  const groups = useMemo(() => {
    const map = new Map<string, VideoItem[]>();
    for (const it of grade?.items || []) {
      const key = it.series || it.englishName || String(it.id);
      const arr = map.get(key);
      if (arr) arr.push(it);
      else map.set(key, [it]);
    }
    return [...map.entries()];
  }, [grade]);

  const handleSelectGrade = (contentLink: string) => {
    setLoading(true);
    setError(null);
    setCurrentChapter(contentLink);
  };

  const linesOf = (item: VideoItem | null) =>
    item ? transcripts.get(`${dir}-${item.id}`) || [] : [];

  if (error) {
    return (
      <div className="english-video-scroll" style={{ padding: 24 }}>
        <Alert type="error" message={t('englishVideo.error') + error} />
      </div>
    );
  }

  // 弹窗（列表页和观看页共用）
  const modals = (
    <>
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
      <VocabularyModal
        item={vocabItem}
        lines={linesOf(vocabItem)}
        words={vocabWords}
        open={Boolean(vocabItem)}
        onClose={() => setVocabItem(null)}
      />
    </>
  );

  // 全年级生字总表
  if (vocabAllOpen) {
    return (
      <VocabularyPage
        words={vocabWords}
        loading={vocabLoading}
        glossed={glossedCount}
        onBack={() => setVocabAllOpen(false)}
      />
    );
  }

  // 站内观看页
  if (watchItem) {
    return (
      <div className="english-video-scroll" style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
        <VideoWatch
          item={watchItem}
          lines={linesOf(watchItem)}
          onBack={() => setWatchItem(null)}
          onLearn={setLearnItem}
          onQuiz={setQuizItem}
        />
        {modals}
      </div>
    );
  }

  return (
    <div className="english-video-scroll" style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ position: 'relative', textAlign: 'center', marginBottom: 18 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Title level={3} style={{ marginBottom: 4 }}>
                {locale === 'zh-CN' ? grade.title : grade.titleEn || grade.title}
              </Title>
              {vocabWords.length > 0 && (
                <Button
                  onClick={() => setVocabAllOpen(true)}
                  style={{ borderRadius: 99 }}
                >
                  {t('englishVideo.vocabTitle')} · {vocabWords.length}
                </Button>
              )}
            </div>
            <Paragraph style={{ color: '#666', marginBottom: 0, fontSize: 14 }}>
              {locale === 'zh-CN' ? grade.description : grade.descriptionEn || grade.description}
            </Paragraph>
          </div>

          {groups.map(([series, items]) => (
            <div key={series} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Title level={4} style={{ margin: 0 }}>
                  {series}
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {items.length}
                </Text>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 14,
                }}
              >
                {items.map((item) => (
                  <VideoCard
                    key={item.id}
                    item={item}
                    hasTranscript={linesOf(item).length > 0}
                    onWatch={setWatchItem}
                    onLearn={setLearnItem}
                    onQuiz={setQuizItem}
                    onVocab={setVocabItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {modals}
    </div>
  );
}

EnglishVideo.displayName = 'EnglishVideo';