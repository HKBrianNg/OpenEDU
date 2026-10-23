// client/src/home/learningresults/LearningResults.tsx
// 学习成果：展示用户已学会（mastered）的「课程内容」
//   - 兼容 EnglishWord（单词）和 BasicEnglish300（句子）
//   - 数据来源：优先服务器 /api/progress（已登录），未登录时回退到本地进度缓存

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Collapse, Empty, Spin, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useLocale } from '../../store/LocaleContext';
import { useAuth } from '../../store/AuthContext';
import { api } from '../../utils/request';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { getCourseBaseUrl } from '../../utils/coursePath';
import { useSpeech } from '../../books/EnglishWord/hooks/useSpeech';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getGradeLabel, getGroupLabel } from '../../books/EnglishWord/utils/labels';
import { DEFAULT_COURSE, normalizeProgressMap } from '../../books/EnglishWord/progressStorage';

const { Title, Paragraph } = Typography;

interface LearningResultsProps {
  onExit?: () => void;
}

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

// 归一化后的「已学会」内容
interface LearnedWord {
  key: string;
  en: string;
  zh?: string | null;
  chapter: string; // '' 表示本地记录，章节未知
  group: string;
  course: string; // 'EnglishWord' | 'BasicEnglish300' | ...
}

const UNKNOWN_CHAPTER = '__unknown__';
const UNGROUPED = '__ungrouped__';

// 过滤芯片
const FilterChip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => {
  const base = {
    padding: '5px 12px',
    borderRadius: 999,
    border: '1px solid #d0d0d0',
    background: '#fff',
    color: '#555',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };
  const activeStyle = {
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

const LearningResults: React.FC<LearningResultsProps> = ({ onExit }) => {
  const { t } = useLocale();
  const isMobile = useIsMobile();
  const { user, isAuthenticated } = useAuth();

  const [words, setWords] = useState<LearnedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  // 过滤条件：null = 全部
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // 朗读（复用英文字库的 TTS 逻辑）
  const { speakingId, speak } = useSpeech();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadFailed(false);

      const map = new Map<string, LearnedWord>();

      // 1) 本地进度兜底（尚未上传到服务器的部分；游客走不到这里，未登录已整页拦截）
      //    归一化与 useProgress 共享同一份 normalizeProgressMap，兼容 v1 字符串 / v2 / 坏值
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

      // 2) 服务器进度（已登录），信息更完整（含章节）
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

      // 3) 从课程数据反查中文释义（服务器/本地进度可能没带 content_zh）
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
                // 单个章节加载失败忽略
              }
            })
          );
          if (cancelled) return;
          setWords((prev) =>
            prev.map((w) => (w.zh ? w : { ...w, zh: zhByEn.get(w.en) || null }))
          );
        } catch {
          // 反查失败不影响主流程，卡片退化为只显示英文
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  // 抽出全部出现过的课程
  const allCourses = useMemo(() => {
    const set = new Set<string>();
    words.forEach((w) => set.add(w.course || DEFAULT_COURSE));
    return Array.from(set);
  }, [words]);

  // 先按课程过滤
  const courseFilteredWords = useMemo(() => {
    if (!selectedCourse) return words;
    return words.filter((w) => (w.course || DEFAULT_COURSE) === selectedCourse);
  }, [words, selectedCourse]);

  // 抽出全部出现过的章节（供过滤）—— 受课程过滤影响
  const allChapters = useMemo(() => {
    const set = new Set<string>();
    courseFilteredWords.forEach((w) => set.add(w.chapter || UNKNOWN_CHAPTER));
    return Array.from(set);
  }, [courseFilteredWords]);

  // 每个章节的词数
  const chapterCounts = useMemo(() => {
    const m = new Map<string, number>();
    courseFilteredWords.forEach((w) => {
      const c = w.chapter || UNKNOWN_CHAPTER;
      m.set(c, (m.get(c) || 0) + 1);
    });
    return m;
  }, [courseFilteredWords]);

  // 课程切换时重置章节/group 过滤，避免选了课程 A 的章节名但当前看的是课程 B
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 课程切换是用户主动行为；这里把章节/group 这两个依赖章节集合的内部状态同步回「初始」 */
    setSelectedChapter(null);
    setSelectedGroup(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedCourse]);

  // 先按章节过滤，得到中间结果
  const chapterFilteredWords = useMemo(() => {
    if (!selectedChapter) return courseFilteredWords;
    return courseFilteredWords.filter((w) => (w.chapter || UNKNOWN_CHAPTER) === selectedChapter);
  }, [courseFilteredWords, selectedChapter]);

  // 在章节范围内抽出 group（随章节变化）
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    chapterFilteredWords.forEach((w) => set.add(w.group || UNGROUPED));
    return Array.from(set);
  }, [chapterFilteredWords]);

  // group 角标（基于章节过滤后的子集，更准确）
  const groupCounts = useMemo(() => {
    const m = new Map<string, number>();
    chapterFilteredWords.forEach((w) => {
      const g = w.group || UNGROUPED;
      m.set(g, (m.get(g) || 0) + 1);
    });
    return m;
  }, [chapterFilteredWords]);

  // 再按 group 过滤
  const filteredWords = useMemo(() => {
    if (!selectedGroup) return chapterFilteredWords;
    return chapterFilteredWords.filter((w) => (w.group || UNGROUPED) === selectedGroup);
  }, [chapterFilteredWords, selectedGroup]);

  const chapterLabel = (chapter: string) =>
    chapter === UNKNOWN_CHAPTER ? t('learningresults.unsyncedChapter') : getGradeLabel(t, chapter);

  const groupLabel = (group: string) =>
    group === UNGROUPED ? t('learningresults.ungrouped') : getGroupLabel(t, group);

  const courseLabel = (course: string) => {
    if (course === 'EnglishWord') return t('learningresults.courseEnglishWord') || '英文单词'
    if (course === 'BasicEnglish300') return t('learningresults.courseBasicEnglish300') || '基础300句'
    return course
  }

  // 点击卡片：在新标签页打开该单词的 Bing 图片搜索，并朗读英文
  // （window.open 必须在点击事件内同步执行，避免被浏览器拦截弹窗）
  const handleCardClick = (word: LearnedWord) => {
    const query = (word.en || '').trim();
    if (!query) return;
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
    speak(query, 'en-US', word.key);
  };

  // 按「年级 · 分组」折叠：学了几百个词时一次铺开是好几屏，既不好找也不好翻。
  // 过滤到只剩一个分组时就不套折叠了 —— 多包一层没意义
  const groupedWords = useMemo(() => {
    const map = new Map<string, LearnedWord[]>();
    for (const w of filteredWords) {
      const label =
        [w.chapter ? chapterLabel(w.chapter) : '', w.group ? groupLabel(w.group) : '']
          .filter(Boolean)
          .join(' · ') || t('learningresults.ungrouped');
      const arr = map.get(label);
      if (arr) arr.push(w);
      else map.set(label, [w]);
    }
    return [...map.entries()];
  }, [filteredWords, chapterLabel, groupLabel, t]);

  /** 卡片网格，折叠区块和「只有一个分组」的情况共用 */
  const renderGrid = (list: LearnedWord[]) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10,
      }}
    >
      {list.map((word) => {
        const ch = word.chapter ? chapterLabel(word.chapter) : '';
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
  );

  // 未登录：学习成果跟账户绑定，游客看不到服务端进度，整页显示登录提示（与日程表一致）
  if (!isAuthenticated) {
    return (
      <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
        {/* 标题行与已登录时一致：按钮贴标题右侧，窄屏退回上方 */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: 28 }}>
          {onExit && (
            <Button
              onClick={onExit}
              style={{
                position: isMobile ? 'static' : 'absolute',
                right: isMobile ? undefined : 0,
                top: isMobile ? undefined : 0,
                marginBottom: isMobile ? 12 : 0,
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
              ← {t('learningresults.backToLobby')}
            </Button>
          )}
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
    );
  }

  return (
    <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
      {/* 返回首页贴标题右侧，绝对定位不占流，标题仍然整页居中。
          窄屏标题和按钮会挤在一起，退回标题上方居中显示。 */}
      <div style={{ position: 'relative', textAlign: 'center', marginBottom: 28 }}>
        {onExit && (
          <Button
            onClick={onExit}
            style={{
              position: isMobile ? 'static' : 'absolute',
              right: isMobile ? undefined : 0,
              top: isMobile ? undefined : 0,
              marginBottom: isMobile ? 12 : 0,
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
            ← {t('learningresults.backToLobby')}
          </Button>
        )}
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
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <FilterChip
                active={selectedCourse === null}
                onClick={() => setSelectedCourse(null)}
              >
                {t('learningresults.filterAll')}{' '}
                <span style={{ opacity: 0.7 }}>({words.length})</span>
              </FilterChip>
              {allCourses.map((c) => {
                const count = words.filter(w => (w.course || DEFAULT_COURSE) === c).length
                return (
                  <FilterChip
                    key={c}
                    active={selectedCourse === c}
                    onClick={() =>
                      setSelectedCourse((prev) => (prev === c ? null : c))
                    }
                  >
                    {courseLabel(c)} <span style={{ opacity: 0.7 }}>({count})</span>
                  </FilterChip>
                )
              })}
            </div>
          )}

          {/* 章节过滤：只剩 1 个章节时也要显示。
               原来用 > 1，选中某课程后若该课程只有一个年级（比如英文单词只有「幼稚园」），
               整行会被隐藏 —— 用户看不到自己在看哪个年级，像是年级按钮凭空消失了。 */}
          {allChapters.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <FilterChip
                active={selectedChapter === null}
                onClick={() => setSelectedChapter(null)}
              >
                {t('learningresults.filterAll')}{' '}
                {/* 计数要跟下面各章节同源：当前课程范围内，而不是全部课程 */}
                <span style={{ opacity: 0.7 }}>({courseFilteredWords.length})</span>
              </FilterChip>
              {allChapters.map((c) => {
                const count = chapterCounts.get(c) || 0;
                return (
                  <FilterChip
                    key={c}
                    active={selectedChapter === c}
                    onClick={() =>
                      setSelectedChapter((prev) => (prev === c ? null : c))
                    }
                  >
                    {chapterLabel(c)} <span style={{ opacity: 0.7 }}>({count})</span>
                  </FilterChip>
                );
              })}
            </div>
          )}

          {/* group 过滤 */}
          {allGroups.length > 1 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 20,
              }}
            >
              <FilterChip
                active={selectedGroup === null}
                onClick={() => setSelectedGroup(null)}
              >
                {t('learningresults.filterAll')}{' '}
                <span style={{ opacity: 0.7 }}>({chapterFilteredWords.length})</span>
              </FilterChip>
              {allGroups.map((g) => {
                const count = groupCounts.get(g) || 0;
                return (
                  <FilterChip
                    key={g}
                    active={selectedGroup === g}
                    onClick={() =>
                      setSelectedGroup((prev) => (prev === g ? null : g))
                    }
                  >
                    {groupLabel(g)} <span style={{ opacity: 0.7 }}>({count})</span>
                  </FilterChip>
                );
              })}
            </div>
          )}

          {filteredWords.length === 0 ? (
            <Empty
              description={t('learningresults.noMatch')}
              style={{ padding: '40px 0' }}
            />
          ) : groupedWords.length === 1 ? (
            // 只剩一个分组就别再包一层折叠了
            renderGrid(groupedWords[0][1])
          ) : (
            <Collapse
              // 默认收起，点标题展开
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
  );
};

export default LearningResults;
