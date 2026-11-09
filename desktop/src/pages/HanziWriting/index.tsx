import { useMemo, useState } from 'react';
import { Button, Segmented, Slider, Typography } from 'antd';
import { AVAILABLE_GRADES, GRADE_CHARS } from './data/characters.generated';
import PracticeArea from './components/PracticeArea';
import CopyBookDialog from './components/CopyBookDialog';
import {
  CATEGORIES,
  charOf,
  GRID_SIZE,
  SPEED_DEFAULT,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  strokesOf,
  wordOf,
} from './constants';
import type { CharCategory, HanziChar, PracticeMode, ScriptMode } from './types';
import { speakOnce } from '../../utils/speech';
import { createTranslator } from '../../utils/locale';
import hanziWritingResource from '../../locales/HanziWriting.json';

const { Title, Text } = Typography;

type GradeFilter = string;
type CatFilter = CharCategory | 'all';

/** 字表里全部年级的字，摊平成一维 */
const ALL_CHARS: HanziChar[] = AVAILABLE_GRADES.flatMap((g) => GRADE_CHARS[g] ?? []);

interface HanziWritingProps {
  onExit?: () => void;
}

export function HanziWriting(_props: HanziWritingProps) {
  const t = createTranslator(hanziWritingResource);

  const [panelOpen, setPanelOpen] = useState(true);

  const [script, setScript] = useState<ScriptMode>('simplified');
  const [grade, setGrade] = useState<string>(String(AVAILABLE_GRADES[0] ?? 1));
  const [cat, setCat] = useState<CatFilter>('all');
  const [mode, setMode] = useState<PracticeMode>('stroke');
  const [index, setIndex] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const [speed, setSpeed] = useState(SPEED_DEFAULT);
  const [appliedSpeed, setAppliedSpeed] = useState(SPEED_DEFAULT);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copyBookOpen, setCopyBookOpen] = useState(false);

  const list = useMemo(() => {
    const byGrade = grade === 'all' ? ALL_CHARS : (GRADE_CHARS[Number(grade)] ?? []);
    if (cat === 'all') return byGrade;
    return byGrade.filter((item) => item.cats.includes(cat));
  }, [grade, cat]);

  const safeIndex = list.length ? Math.min(index, list.length - 1) : 0;
  const entry = list[safeIndex] ?? null;

  const selectedEntries = useMemo(
    () => ALL_CHARS.filter((e) => selected.has(e.char)),
    [selected],
  );
  const toggleSelect = (char: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(char)) next.delete(char);
      else next.add(char);
      return next;
    });
  const selectAllInList = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const e of list) next.add(e.char);
      return next;
    });
  const clearSelected = () => setSelected(new Set());

  const bumpReset = () => setResetKey((k) => k + 1);
  const pickChar = (i: number) => setIndex(Math.max(0, Math.min(i, list.length - 1)));

  const changeGrade = (g: GradeFilter) => {
    setGrade(g);
    setIndex(0);
  };
  const changeCat = (c: CatFilter) => {
    setCat(c);
    setIndex(0);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
      {/* 折叠头部触发器 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: 12,
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.03)',
          borderRadius: 8
        }}
        onClick={() => setPanelOpen(!panelOpen)}
      >
        <Text strong>{t('hanziwriting.panelTitle')}</Text>
        <Text type="secondary">
          {panelOpen ? t('hanziwriting.panel.collapse') : t('hanziwriting.panel.expand')}
        </Text>
      </div>

      {panelOpen && (
        <>
          {/* 标题移进折叠区域内 */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Title level={2} style={{ marginBottom: 4 }}>
              ✍️ {t('hanziwriting.title')}
            </Title>
            <Text type="secondary">{t('hanziwriting.subtitle')}</Text>
          </div>

          <FilterRow label={t('hanziwriting.script')}>
            <Segmented
              value={script}
              onChange={(v) => setScript(v as ScriptMode)}
              options={[
                { label: t('hanziwriting.scriptSimplified'), value: 'simplified' },
                { label: t('hanziwriting.scriptTraditional'), value: 'traditional' },
              ]}
            />
          </FilterRow>

          <FilterRow label={t('hanziwriting.grade')}>
            <Segmented
              value={grade}
              onChange={(v: string) => changeGrade(v)}
              options={[
                { label: t('hanziwriting.allGrades'), value: 'all' },
                ...AVAILABLE_GRADES.map((g) => ({
                  label: t(`hanziwriting.grade${g}`),
                  value: String(g),
                })),
              ]}
            />
          </FilterRow>

          <FilterRow label={t('hanziwriting.category')}>
            <div
              className="custom-scroll"
              style={{
                maxHeight: 180,
                overflowY: 'scroll',
                overflowX: 'hidden',
                paddingRight: 8,
                paddingBottom: 4
              }}
            >
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Chip active={cat === 'all'} onClick={() => changeCat('all')}>
                  {t('hanziwriting.allCategories')}
                </Chip>
                {CATEGORIES.map((c) => (
                  <Chip key={c.id} active={cat === c.id} onClick={() => changeCat(c.id)}>
                    {c.icon} {t(`hanziwriting.cat.${c.id}`)}
                  </Chip>
                ))}
              </div>
            </div>
          </FilterRow>

          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <Text type="secondary">
              {t('hanziwriting.charCount')} <b>{list.length}</b>
              {cat !== 'all' ? ` · ${t(`hanziwriting.cat.${cat}`)}` : ''}
            </Text>
            <div style={{ width: 1, height: 16, background: '#e0e0e0' }} />
            <Text type="secondary">
              📄 {t('hanziwriting.copyBook.selected')} <b>{selected.size}</b>
            </Text>
            <Button size="small" onClick={selectAllInList} disabled={list.length === 0}>
              {t('hanziwriting.copyBook.selectAllInView')}
            </Button>
            <Button size="small" onClick={clearSelected} disabled={selected.size === 0}>
              {t('hanziwriting.copyBook.clearAll')}
            </Button>
            <div style={{ flex: 1 }} />
            <Button
              type="primary"
              size="small"
              onClick={() => setCopyBookOpen(true)}
              disabled={selected.size === 0}
            >
              📄 {t('hanziwriting.copyBook.generate')}
            </Button>
          </div>
        </>
      )}

      {!entry ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Text type="secondary">{t('hanziwriting.noChar')}</Text>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ width: GRID_SIZE + 8, flex: '0 0 auto' }}>
            <Segmented
              block
              value={mode}
              onChange={(v) => setMode(v as PracticeMode)}
              options={[
                { label: t('hanziwriting.modeStroke'), value: 'stroke' },
                { label: t('hanziwriting.modeTrace'), value: 'trace' },
                { label: t('hanziwriting.modeWrite'), value: 'write' },
              ]}
              style={{ marginBottom: 12 }}
            />

            {mode === 'stroke' && (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}
              >
                <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
                  {t('hanziwriting.speed')}
                </Text>
                <Slider
                  style={{ flex: 1 }}
                  min={SPEED_MIN}
                  max={SPEED_MAX}
                  step={SPEED_STEP}
                  value={speed}
                  onChange={setSpeed}
                  onAfterChange={setAppliedSpeed}
                />
                <Text type="secondary" style={{ width: 34 }}>
                  {speed.toFixed(1)}x
                </Text>
              </div>
            )}

            <div key={`${script}-${entry.char}-${mode}-${resetKey}`}>
              <PracticeArea
                entry={entry}
                script={script}
                mode={mode}
                speed={appliedSpeed}
                resetKey={resetKey}
                onReset={bumpReset}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 16,
                gap: 8,
              }}
            >
              <Button onClick={() => pickChar(safeIndex - 1)} disabled={safeIndex === 0}>
                ← {t('hanziwriting.prev')}
              </Button>
              <Text type="secondary">
                {safeIndex + 1} / {list.length}
              </Text>
              <Button
                onClick={() => pickChar(safeIndex + 1)}
                disabled={safeIndex >= list.length - 1}
              >
                {t('hanziwriting.next')} →
              </Button>
            </div>
          </div>

          <div style={{ flex: '1 1 380px', minWidth: 300 }}>
            <div
              style={{
                display: 'flex',
                gap: 18,
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                marginBottom: 14,
              }}
            >
              <Info label={t('hanziwriting.pinyin')} value={entry.pinyin} />
              <Info label={t('hanziwriting.exampleWord')} value={wordOf(entry, script)} />
              <Info
                label={t('hanziwriting.strokeCount')}
                value={String(strokesOf(entry, script))}
              />
              <Info label={t('hanziwriting.meaning')} value={entry.en} />
              <Button onClick={() => speakOnce(wordOf(entry, script), 'zh-CN')}>
                🔊 {t('hanziwriting.readAloud')}
              </Button>
            </div>

            <div
              className="custom-scroll"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
                gap: 6,
                maxHeight: 420,
                overflowY: 'scroll',
                overflowX: 'hidden',
                padding: 4,
              }}
            >
              {list.map((item, i) => {
                const isSel = selected.has(item.char);
                return (
                  <div key={item.char} style={{ position: 'relative' }}>
                    <button
                      onClick={() => pickChar(i)}
                      style={{
                        width: '100%',
                        border:
                          i === safeIndex ? '2px solid #2f54eb' : '1px solid #e8e8e8',
                        background: i === safeIndex ? '#f0f5ff' : isSel ? '#fff7e6' : '#fff',
                        borderRadius: 8,
                        padding: '6px 0 4px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 22, lineHeight: 1.2 }}>{charOf(item, script)}</div>
                      <div style={{ fontSize: 10, color: '#999' }}>{item.pinyin}</div>
                    </button>
                    <div
                      role="checkbox"
                      aria-checked={isSel}
                      title={t('hanziwriting.copyBook.selectHint')}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.char);
                      }}
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 14,
                        height: 14,
                        background: isSel ? '#2f54eb' : '#fff',
                        border: '1px solid ' + (isSel ? '#2f54eb' : '#ccc'),
                        borderRadius: 3,
                        color: '#fff',
                        fontSize: 10,
                        lineHeight: '12px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      {isSel ? '✓' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {copyBookOpen && (
        <CopyBookDialog
          entries={selectedEntries}
          script={script}
          onClose={() => setCopyBookOpen(false)}
        />
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <Text
        type="secondary"
        style={{ marginTop: 4, whiteSpace: 'nowrap', fontSize: 13, minWidth: 34 }}
      >
        {label}
      </Text>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button size="small" shape="round" type={active ? 'primary' : 'default'} onClick={onClick}>
      {children}
    </Button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#999' }}>{label}</div>
      <div style={{ fontSize: 20, lineHeight: 1.2 }}>{value}</div>
    </div>
  );
}
