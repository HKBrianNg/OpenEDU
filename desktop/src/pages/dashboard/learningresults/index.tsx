// desktop/src/pages/dashboard/learningresults/index.tsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert, Button, Collapse, Empty, Spin, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useLocale } from '../../../store/LocaleContext';
import { useAuth } from '../../../store/AuthContext';
import { api } from '../../../utils/request';
import { storage, STORAGE_KEYS } from '../../../utils/storage';
import { getCourseBaseUrl, getCourseDataUrl } from '../../../utils/coursePath';
import { useSpeech } from '../../english/EnglishWord/hooks/useSpeech';
import { getGradeLabel, getGroupLabel } from '../../english/EnglishWord/utils/labels';
import { DEFAULT_COURSE, normalizeProgressMap } from '../../english/EnglishWord/progressStorage';
import './learningresults.css';

const { Title, Paragraph } = Typography;

// 服务器返回的学习进度记录（snake_case）
interface ProgressRecord {
  course_name?: string | null;
  content_en?: string | null;
  content_zh?: string | null;
  chapter_name?: string | null;
  group_name?: string | null;
  status?: string | null;
}

interface ProgressResponse {
  success?: boolean;
  data?: ProgressRecord[];
}

interface LearnedWord {
  key: string;
  en: string;
  zh?: string | null;
  chapter: string;
  group: string;
  course: string;
}

const UNKNOWN_CHAPTER = '__unknown__';
const UNGROUPED = '__ungrouped__';

const FilterChip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => {
  const base: React.CSSProperties = {
    padding: '5px 12px',
    borderRadius: 999,
    border: '1px solid #d0d0d0',
    background: '#fff',
    color: '#555',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };
  const activeStyle: React.CSSProperties = {
    ...base,
    background: '#ff4d4f',
    borderColor: '#ff4d4f',
    color: '#fff',
  };
  return (
    <button type="button" onClick={onClick} style={active ? activeStyle : base}>
      {children}
    </button>
  );
};

export function LearningResults() {
  const { t } = useLocale();
  const { user, isAuthenticated } = useAuth();

  const [words, setWords] = useState<LearnedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [shortsGroups, setShortsGroups] = useState<Record<string, string>>({});

  const { speakingId, speak } = useSpeech();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadFailed(false);

      const map = new Map<string, LearnedWord>();

      // 1) 本地进度兜底
      const { map: localProgress } = normalizeProgressMap(
        storage.get<unknown>(STORAGE_KEYS.englishwordProgress)
      );
      Object.entries(localProgress).forEach(([key, entry]) => {
        if (entry.status !== 'mastered') return;
        const [group = '', en = ''] = key.split('|');
        if (!en) return;
        map.set(`${group}|${en}`, {
          key: `${group}|${en}`,
          en,
          group,
          chapter: entry.chapter,
          zh: entry.zh || null,
          course: entry.course || DEFAULT_COURSE,
        });
      });

      // 2) 服务器进度
      if (isAuthenticated && user?.id) {
        try {
          const res = await api.get<ProgressResponse>(
            `/api/progress?userId=${encodeURIComponent(user.id)}`
          );
          if (res.ok && res.data?.success && Array.isArray(res.data.data)) {
            res.data.data.forEach((record) => {
              if (record.status !== 'mastered') return;
              const en = record.content_en || '';
              if (!en) return;
              const group = record.group_name || '';
              const key = `${group}|${en}`;
              map.set(key, {
                key,
                en,
                zh: record.content_zh,
                chapter: record.chapter_name || '',
                group,
                course: record.course_name || DEFAULT_COURSE,
              });
            });
          } else {
            setLoadFailed(true);
          }
        } catch {
          setLoadFailed(true);
        }
      }

      if (cancelled) return;
      const list = Array.from(map.values());
      setWords(list);
      setLoading(false);

      // 3) 反查中文释义
      if (list.some((w) => !w.zh)) {
        try {
          const baseUrl = getCourseBaseUrl('EnglishWord');
          const indexRes = await fetch(`${baseUrl}/data.json`);
          const index = await indexRes.json();
          const chapters: { contentLink: string }[] = index?.chapters || [];
          const zhByEn = new Map<string, string>();
          await Promise.all(
            chapters.map(async (ch) => {
              try {
                const res = await fetch(`${baseUrl}/${ch.contentLink}`);
                const items: { name?: string; en?: string }[] = await res.json();
                (Array.isArray(items) ? items : []).forEach((item) => {
                  if (item?.en && item?.name) zhByEn.set(item.en, item.name);
                });
              } catch {
                // ignore
              }
            })
          );
          if (cancelled) return;
          setWords((prev) =>
            prev.map((w) => (w.zh ? w : { ...w, zh: zhByEn.get(w.en) || null }))
          );
        } catch {
          // ignore
        }
      }

      // 4) 英文短句分组中文名
      try {
        const shortsRes = await fetch(getCourseDataUrl('EnglishShorts'));
        const shortsData = await shortsRes.json();
        const names: Record<string, string> = {};
        (Array.isArray(shortsData?.groups) ? shortsData.groups : []).forEach(
          (g: { id?: string; name?: string }) => {
            if (g?.id && g?.name) names[g.id] = g.name;
          }
        );
        if (!cancelled) setShortsGroups(names);
      } catch {
        // ignore
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  // 过滤逻辑（全部 useMemo，跟原版一致）
  const allCourses = useMemo(() => {
    const set = new Set<string>();
    words.forEach((w) => set.add(w.course || DEFAULT_COURSE));
    return Array.from(set);
  }, [words]);

  const courseFilteredWords = useMemo(() => {
    if (!selectedCourse) return words;
    return words.filter((w) => (w.course || DEFAULT_COURSE) === selectedCourse);
  }, [words, selectedCourse]);

  const allChapters = useMemo(() => {
    const set = new Set<string>();
    courseFilteredWords.forEach((w) => set.add(w.chapter || UNKNOWN_CHAPTER));
    return Array.from(set);
  }, [courseFilteredWords]);

  const chapterCounts = useMemo(() => {
    const m = new Map<string, number>();
    courseFilteredWords.forEach((w) => {
      const c = w.chapter || UNKNOWN_CHAPTER;
      m.set(c, (m.get(c) || 0) + 1);
    });
    return m;
  }, [courseFilteredWords]);

  useEffect(() => {
    setSelectedChapter(null);
    setSelectedGroup(null);
  }, [selectedCourse]);

  const chapterFilteredWords = useMemo(() => {
    if (!selectedChapter) return courseFilteredWords;
    return courseFilteredWords.filter((w) => (w.chapter || UNKNOWN_CHAPTER) === selectedChapter);
  }, [courseFilteredWords, selectedChapter]);

  const allGroups = useMemo(() => {
    const set = new Set<string>();
    chapterFilteredWords.forEach((w) => set.add(w.group || UNGROUPED));
    return Array.from(set);
  }, [chapterFilteredWords]);

  const groupCounts = useMemo(() => {
    const m = new Map<string, number>();
    chapterFilteredWords.forEach((w) => {
      const g = w.group || UNGROUPED;
      m.set(g, (m.get(g) || 0) + 1);
    });
    return m;
  }, [chapterFilteredWords]);

  const filteredWords = useMemo(() => {
    if (!selectedGroup) return chapterFilteredWords;
    return chapterFilteredWords.filter((w) => (w.group || UNGROUPED) === selectedGroup);
  }, [chapterFilteredWords, selectedGroup]);

  const courseLabel = useCallback((course: string) => {
    if (course === 'EnglishWord') return t('learningresults.courseEnglishWord') || '英文单词';
    if (course === 'BasicEnglish300') return t('learningresults.courseBasicEnglish300') || '基础300句';
    if (course === 'EnglishShorts') return t('learningresults.courseEnglishShorts') || '英文短句';
    return course;
  }, [t]);

  const chapterLabel = useCallback((chapter: string, course?: string) => {
    if (chapter === UNKNOWN_CHAPTER) {
      return course ? courseLabel(course) : t('learningresults.unsyncedChapter');
    }
    return getGradeLabel(t, chapter);
  }, [courseLabel, t]);

  const groupLabel = useCallback((group: string) => {
    if (group === UNGROUPED) return t('learningresults.ungrouped');
    if (shortsGroups[group]) return shortsGroups[group];
    return getGroupLabel(t, group);
  }, [shortsGroups, t]);

  const handleCardClick = useCallback((word: LearnedWord) => {
    const query = (word.en || '').trim();
    if (!query) return;
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
    speak(query, 'en-US', word.key);
  }, [speak]);

  const groupedWords = useMemo(() => {
    const map = new Map<string, LearnedWord[]>();
    for (const w of filteredWords) {
      const label =
        [w.chapter ? chapterLabel(w.chapter, w.course) : '', w.group ? groupLabel(w.group) : '']
          .filter(Boolean)
          .join(' · ') || t('learningresults.ungrouped');
      const arr = map.get(label);
      if (arr) arr.push(w);
      else map.set(label, [w]);
    }
    return [...map.entries()];
  }, [filteredWords, chapterLabel, groupLabel, t]);

  const renderGrid = useCallback((list: LearnedWord[]) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10,
      }}
    >
      {list.map((word) => {
        const ch = word.chapter ? chapterLabel(word.chapter, word.course) : '';
        const g = word.group ? groupLabel(word.group) : '';
        const ctx = [ch, g].filter(Boolean).join(' · ');
        const speaking = speakingId === word.key;
        const isSentence = (word.course || DEFAULT_COURSE) !== 'EnglishWord';
        return (
          <div
            key={word.key}
            onClick={() => handleCardClick(word)}
            title={t('learningresults.cardClickHint')}
            style={{
              border: '1px solid #e8e8e8',
              borderRadius: 8,
              padding: '10px 8px',
              textAlign: 'center',
              background: '#fafafa',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                fontSize: isSentence ? 14 : 16,
                fontWeight: 600,
                color: speaking ? '#1976d2' : '#333',
                transition: 'color 0.25s',
                lineHeight: 1.3,
              }}
            >
              {word.en}
              {speaking && (
                <span style={{ fontSize: 12, color: '#1976d2', marginLeft: 6 }}>🔊</span>
              )}
            </div>
            {word.zh ? (
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{word.zh}</div>
            ) : null}
            {ctx ? (
              <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>{ctx}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  ), [chapterLabel, groupLabel, handleCardClick, speakingId, t]);

  if (!isAuthenticated) {
    return (
      <div className="learning-results-scroll">
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 16px 48px' }}>
          <div style={{ position: 'relative', textAlign: 'center', marginBottom: 28 }}>
            <Title level={2} style={{ marginBottom: 4 }}>
              {t('learningresults.title')}
            </Title>
            <Paragraph italic style={{ color: '#888', fontSize: 16, margin: 0 }}>
              {t('learningresults.description')}
            </Paragraph>
          </div>
          <Empty
            description={t('learningresults.loginRequired')}
            style={{ padding: '48px 0' }}
          >
            <Link to="/login">
              <Button type="primary" style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}>
                {t('auth.loginButton')}
              </Button>
            </Link>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="learning-results-scroll">
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 16px 48px' }}>
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: 28 }}>
          <Title level={2} style={{ marginBottom: 4 }}>
            {t('learningresults.title')}
          </Title>
          <Paragraph italic style={{ color: '#888', fontSize: 16, margin: 0 }}>
            {t('learningresults.description')}
          </Paragraph>
        </div>

        {loadFailed && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 20 }}
            message={t('learningresults.loadFailed')}
          />
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin />
            <div style={{ marginTop: 12, color: '#999' }}>{t('learningresults.loading')}</div>
          </div>
        ) : words.length === 0 ? (
          <Empty
            description={t('learningresults.empty')}
            style={{ padding: '48px 0' }}
          />
        ) : (
          <>
            <div style={{ marginBottom: 16, color: '#555', fontSize: 15 }}>
              {t('learningresults.masteredLabel')}
              <strong style={{ color: '#ff4d4f', fontSize: 20, margin: '0 4px' }}>
                {words.length}
              </strong>
            </div>

            {/* 课程过滤 */}
            {allCourses.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <FilterChip active={selectedCourse === null} onClick={() => setSelectedCourse(null)}>
                  {t('learningresults.filterAll')}{' '}
                  <span style={{ opacity: 0.7 }}>({words.length})</span>
                </FilterChip>
                {allCourses.map((c) => {
                  const count = words.filter(w => (w.course || DEFAULT_COURSE) === c).length;
                  return (
                    <FilterChip
                      key={c}
                      active={selectedCourse === c}
                      onClick={() => setSelectedCourse((prev) => (prev === c ? null : c))}
                    >
                      {courseLabel(c)} <span style={{ opacity: 0.7 }}>({count})</span>
                    </FilterChip>
                  );
                })}
              </div>
            )}

            {/* 章节过滤 */}
            {!(allChapters.length === 1 && allChapters[0] === UNKNOWN_CHAPTER) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <FilterChip active={selectedChapter === null} onClick={() => setSelectedChapter(null)}>
                  {t('learningresults.filterAll')}{' '}
                  <span style={{ opacity: 0.7 }}>({courseFilteredWords.length})</span>
                </FilterChip>
                {allChapters.map((c) => {
                  const count = chapterCounts.get(c) || 0;
                  return (
                    <FilterChip
                      key={c}
                      active={selectedChapter === c}
                      onClick={() => setSelectedChapter((prev) => (prev === c ? null : c))}
                    >
                      {chapterLabel(c)} <span style={{ opacity: 0.7 }}>({count})</span>
                    </FilterChip>
                  );
                })}
              </div>
            )}

            {/* group 过滤 */}
            {allGroups.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                <FilterChip active={selectedGroup === null} onClick={() => setSelectedGroup(null)}>
                  {t('learningresults.filterAll')}{' '}
                  <span style={{ opacity: 0.7 }}>({chapterFilteredWords.length})</span>
                </FilterChip>
                {allGroups.map((g) => {
                  const count = groupCounts.get(g) || 0;
                  return (
                    <FilterChip
                      key={g}
                      active={selectedGroup === g}
                      onClick={() => setSelectedGroup((prev) => (prev === g ? null : g))}
                    >
                      {groupLabel(g)} <span style={{ opacity: 0.7 }}>({count})</span>
                    </FilterChip>
                  );
                })}
              </div>
            )}

            {filteredWords.length === 0 ? (
              <Empty description={t('learningresults.noMatch')} style={{ padding: '40px 0' }} />
            ) : groupedWords.length === 1 ? (
              renderGrid(groupedWords[0][1])
            ) : (
              <Collapse
                defaultActiveKey={[]}
                style={{ background: 'transparent' }}
                items={groupedWords.map(([label, list]) => ({
                  key: label,
                  label: (
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      {label} <span style={{ opacity: 0.6 }}>({list.length})</span>
                    </span>
                  ),
                  children: renderGrid(list),
                }))}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

LearningResults.displayName = 'LearningResults';