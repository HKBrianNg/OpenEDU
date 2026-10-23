// client/src/books/EnglishVideo/components/VocabularyList.tsx
//
// 生字表展示：搜索 + 排序 + 筛选 + 逐条朗读。
// 总表和「本集生字」共用这一个组件，区别只在传进来的 words。
//
// 1537 条一次全渲染会卡，所以分页：每次多显示 120 条。

import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Empty, Input, Segmented, Spin, Typography } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import { useSpeech } from '../../EnglishWord/hooks/useSpeech';
import type { VocabularyWord } from '../types';

const { Text } = Typography;

const PAGE = 120;
/** 例句超过这个长度就折叠：有些台词行本身就是一整段剧情 */
const LONG_EX = 150;

interface VocabularyListProps {
  words: VocabularyWord[];
  loading?: boolean;
  emptyText?: string;
}

export default function VocabularyList({ words, loading, emptyText }: VocabularyListProps) {
  const { locale, t } = useLocale();
  const { speakingId, speak } = useSpeech();
  // i18n 的 t() 只吃 key，不支持传参，所以带 {n} 的文案自己替换
  const fmt = (key: string, n: number) => t(key).replace('{n}', String(n));
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'freq' | 'alpha'>('freq');
  const [glossedOnly, setGlossedOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  /** 哪些长例句被展开了，key = 单词 */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // 换筛选条件时把分页收回第一页，否则会出现「搜完还停在第 8 页」
  useEffect(() => {
    setLimit(PAGE);
  }, [q, sort, glossedOnly, words]);

  // 全部词条都有释义时，「只看已释义」筛不掉任何东西，开关要藏起来
  const allGlossed = words.length > 0 && words.every((w) => w.zh);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    let list = words;
    if (kw) {
      list = list.filter((w) => w.w.includes(kw) || (w.zh && w.zh.includes(kw)));
    }
    if (glossedOnly) list = list.filter((w) => w.zh);
    return [...list].sort((a, b) =>
      sort === 'freq' ? b.freq - a.freq : a.w.localeCompare(b.w),
    );
  }, [words, q, sort, glossedOnly]);

  const shown = filtered.slice(0, limit);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
        <div style={{ marginTop: 10, color: '#999' }}>{t('englishVideo.vocabLoading')}</div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <Input.Search
          allowClear
          placeholder={t('englishVideo.vocabSearch')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <Segmented
          value={sort}
          onChange={(v) => setSort(v as 'freq' | 'alpha')}
          options={[
            { label: t('englishVideo.vocabSortFreq'), value: 'freq' },
            { label: t('englishVideo.vocabSortAlpha'), value: 'alpha' },
          ]}
        />
        {/* 全部都有释义时这个开关筛不掉任何东西，显示反而让人困惑 */}
        {!allGlossed && (
          <Checkbox
            checked={glossedOnly}
            onChange={(e) => setGlossedOnly(e.target.checked)}
          >
            {t('englishVideo.vocabGlossedOnly')}
          </Checkbox>
        )}
        <Text type="secondary" style={{ fontSize: 13, marginLeft: 'auto' }}>
          {fmt('englishVideo.vocabCount', filtered.length)}
        </Text>
      </div>

      {filtered.length === 0 ? (
        <Empty description={emptyText || t('englishVideo.vocabEmpty')} />
      ) : (
        <>
          <div style={{ display: 'grid', gap: 10 }}>
            {shown.map((w) => {
              const epLabel =
                locale === 'zh' && w.epZh ? w.epZh : w.epName;
              const isLong = w.ex.length > LONG_EX;
              const open = Boolean(expanded[w.w]);
              return (
                <div
                  key={w.w}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 10,
                    padding: '10px 14px',
                    background: '#fff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: 17, fontWeight: 600 }}>{w.w}</span>
                    <Button
                      size="small"
                      type="text"
                      onClick={() => speak(w.w, 'en-US', `w-${w.w}`)}
                      style={{ padding: '0 4px', fontSize: 12 }}
                    >
                      {speakingId === `w-${w.w}` ? '■' : '🔊'}
                    </Button>
                    <span style={{ color: w.zh ? '#333' : '#bbb', fontSize: 14 }}>
                      {w.zh || t('englishVideo.vocabNoGloss')}
                    </span>
                    <span style={{ marginLeft: 'auto', color: '#999', fontSize: 12 }}>
                      {fmt('englishVideo.vocabFreq', w.freq)}
                    </span>
                  </div>

                  <div style={{ marginTop: 6 }}>
                    <div
                      style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}
                    >
                      <span style={{ color: '#555', fontSize: 13, flex: 1 }}>
                        {isLong && !open ? `${w.ex.slice(0, LONG_EX)}…` : w.ex}
                        {isLong && (
                          <Button
                            size="small"
                            type="link"
                            style={{ padding: '0 0 0 4px', fontSize: 12 }}
                            onClick={() =>
                              setExpanded((m) => ({ ...m, [w.w]: !open }))
                            }
                          >
                            {open ? (locale === 'zh' ? '收起' : 'Less') : locale === 'zh' ? '展开' : 'More'}
                          </Button>
                        )}
                      </span>
                      <Button
                        size="small"
                        type="text"
                        onClick={() => speak(w.ex, 'en-US', `ex-${w.w}`)}
                        style={{ padding: '0 4px', fontSize: 12 }}
                      >
                        {speakingId === `ex-${w.w}` ? '■' : '🔊'}
                      </Button>
                    </div>
                    <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
                      {w.exZh}
                    </div>
                    <div style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>
                      {t('englishVideo.vocabFrom')} #{w.epId} {epLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {limit < filtered.length && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button onClick={() => setLimit((v) => v + PAGE)}>
                {locale === 'zh' ? '显示更多' : 'Show more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
