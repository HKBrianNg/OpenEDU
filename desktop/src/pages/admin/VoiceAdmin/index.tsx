// desktop/src/pages/admin/VoiceAdmin/index.tsx
//
// 课程语音管理。移植自 img-library/openEDU/tts_admin/main.py：
// 选项目（EnglishShorts / BasicEnglish300 / KnowledgeBase）→ 解析章节条目
// → 勾选中/英文 → 用微软 edge-tts 批量生成朗读 mp3（<project>/audio/<stem>/<slug>_{zh,en}.mp3）
// → 回写 audio.json 状态。试听为合成后即时播放（无需 pygame）。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Checkbox, Progress, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useLocale } from '../../../store/LocaleContext';
import { DEFAULT_EN_VOICE, DEFAULT_ZH_VOICE } from './voiceDefaults';
import type {
  CloudVoice,
  GenProgress,
  GenTask,
  IpcResult,
  VoiceChapter,
  VoiceEntry,
  VoiceProject,
} from './voiceTypes';

const { Text } = Typography;

async function invoke<T>(channel: string, ...args: unknown[]): Promise<IpcResult<T> | undefined> {
  if (!window.ipcRenderer) return undefined;
  return (await window.ipcRenderer.invoke(channel, ...args)) as IpcResult<T>;
}

type CheckMap = Record<string, { zh: boolean; en: boolean }>;

export function VoiceAdmin() {
  const { t } = useLocale();
  const { message } = App.useApp();

  const [projects, setProjects] = useState<VoiceProject[]>([]);
  const [project, setProject] = useState('');
  const [chapters, setChapters] = useState<VoiceChapter[]>([]);
  const [entries, setEntries] = useState<VoiceEntry[]>([]);
  const [chapterFilter, setChapterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'done'>('all');
  const [checks, setChecks] = useState<CheckMap>({});

  const [cloudVoices, setCloudVoices] = useState<CloudVoice[]>([]);
  const [zhVoice, setZhVoice] = useState(DEFAULT_ZH_VOICE);
  const [enVoice, setEnVoice] = useState(DEFAULT_EN_VOICE);

  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [status, setStatus] = useState('');
  const [previewing, setPreviewing] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ─── 数据加载 ───
  const loadProject = useCallback(
    async (name: string) => {
      const res = await invoke<{ chapters: VoiceChapter[]; entries: VoiceEntry[] }>('voice:load', name);
      if (res?.ok && res.data) {
        setChapters(res.data.chapters);
        setEntries(res.data.entries);
        setChapterFilter('');
        setChecks({});
        setStatus(
          `${name}: ${res.data.entries.length} ${t('Voice.itemUnit')}, ${res.data.chapters.length} ${t('Voice.chapterUnit')}`,
        );
      } else {
        message.error(`${t('Voice.loadFailed')}: ${res?.error || ''}`);
      }
    },
    [message, t],
  );

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [pr, vr] = await Promise.all([
        invoke<VoiceProject[]>('voice:projects'),
        invoke<CloudVoice[]>('voice:voices'),
      ]);
      const list = pr?.data || [];
      setProjects(list);
      setCloudVoices(vr?.data || []);
      if (list.length > 0) {
        setProject(list[0].name);
        await loadProject(list[0].name);
      } else {
        setStatus(t('Voice.noProjects'));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 进度事件 ───
  useEffect(() => {
    const ipc = window.ipcRenderer;
    if (!ipc) return;
    const handler = (_e: unknown, p: GenProgress) => {
      if (p.stage === 'start') {
        setProgress({ done: 0, total: p.total });
      } else if (p.stage === 'item') {
        setProgress({ done: p.done, total: p.total });
        setStatus(
          `${t('Voice.generating')} ${p.done}/${p.total}: ${p.slug} (${p.lang})${p.ok ? '' : ` - ${p.error || ''}`}`,
        );
      }
    };
    ipc.on('voice:progress', handler as never);
    return () => {
      ipc.off('voice:progress', handler as never);
    };
  }, [t]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  // ─── 派生数据 ───
  const filteredEntries = useMemo(() => {
    let list = entries;
    if (chapterFilter) list = list.filter((e) => e.chapter === chapterFilter);
    if (statusFilter !== 'all') {
      list = list.filter((e) => {
        const done = e.zhOk && e.enOk;
        const none = !e.zhOk && !e.enOk;
        if (statusFilter === 'done') return done;
        if (statusFilter === 'pending') return none;
        return !done && !none; // partial
      });
    }
    return list;
  }, [entries, chapterFilter, statusFilter]);

  const zhOptions = useMemo(
    () =>
      cloudVoices
        .filter((v) => v.locale.startsWith('zh-CN'))
        .map((v) => ({ value: v.shortName, label: `${v.shortName} ${v.gender === 'Female' ? '♀' : '♂'}` })),
    [cloudVoices],
  );
  const enOptions = useMemo(
    () =>
      cloudVoices
        .filter((v) => v.locale.startsWith('en-'))
        .map((v) => ({ value: v.shortName, label: `${v.shortName} ${v.gender === 'Female' ? '♀' : '♂'}` })),
    [cloudVoices],
  );

  // ─── 操作 ───
  const toggleCheck = (id: string, lang: 'zh' | 'en') => {
    setChecks((prev) => {
      const cur = prev[id] || { zh: false, en: false };
      return { ...prev, [id]: { ...cur, [lang]: !cur[lang] } };
    });
  };

  const setAllChecks = (value: boolean) => {
    const next: CheckMap = { ...checks };
    for (const e of filteredEntries) next[e.id] = { zh: value, en: value };
    setChecks(next);
  };

  const handlePreview = async (e: VoiceEntry, lang: 'zh' | 'en') => {
    const text = lang === 'zh' ? e.zh : e.en;
    if (!text) {
      message.warning(t('Voice.noText'));
      return;
    }
    const key = `${e.id}:${lang}`;
    setPreviewing(key);
    try {
      const res = await invoke<string>('voice:preview', text, lang === 'zh' ? zhVoice : enVoice);
      if (res?.ok && res.data) {
        const audio = new Audio(`data:audio/mpeg;base64,${res.data}`);
        audioRef.current?.pause();
        audioRef.current = audio;
        audio.onended = () => setPreviewing('');
        await audio.play();
        return;
      }
      message.error(`${t('Voice.previewFailed')}: ${res?.error || ''}`);
    } finally {
      setPreviewing('');
    }
  };

  const refreshVoices = async () => {
    setStatus(t('Voice.refreshingVoices'));
    const res = await invoke<CloudVoice[]>('voice:voices');
    if (res?.ok && res.data) {
      setCloudVoices(res.data);
      const zh = res.data.filter((v) => v.locale.startsWith('zh-CN')).length;
      const en = res.data.filter((v) => v.locale.startsWith('en-')).length;
      setStatus(`${t('Voice.voicesRefreshed')} (zh ${zh} / en ${en})`);
    }
  };

  const handleCancel = async () => {
    await invoke<null>('voice:cancel');
    setStatus(t('Voice.cancelling'));
  };

  const handleGenerate = async () => {
    const tasks: GenTask[] = filteredEntries
      .filter((e) => checks[e.id]?.zh || checks[e.id]?.en)
      .map((e) => ({
        stem: e.stem,
        index: e.index,
        part: e.part,
        slug: e.slug,
        zh: e.zh,
        en: e.en,
        genZh: !!checks[e.id]?.zh,
        genEn: !!checks[e.id]?.en,
      }));
    if (tasks.length === 0) {
      message.warning(t('Voice.noTasks'));
      return;
    }
    setGenerating(true);
    setProgress({ done: 0, total: tasks.length });
    try {
      const res = await invoke<{ generated: number; skipped: number }>('voice:generate', {
        project,
        tasks,
        zhVoice,
        enVoice,
        force,
      });
      if (res?.ok) {
        message.success(
          `${t('Voice.generateDone')} (+${res.data?.generated ?? 0}, ${t('Voice.skipped')} ${res.data?.skipped ?? 0})`,
        );
        await loadProject(project); // 重新读取 audio.json 刷新状态列
      } else {
        message.error(`${t('Voice.generateFailed')}: ${res?.error || ''}`);
        setStatus(`${t('Voice.generateFailed')} (${res?.error || ''})`);
      }
    } finally {
      setGenerating(false);
    }
  };

  // ─── 表格 ───
  const columns: ColumnsType<VoiceEntry> = [
    { title: t('Voice.chapter'), dataIndex: 'chapter', width: 120, ellipsis: true },
    {
      title: t('Voice.type'),
      dataIndex: 'part',
      width: 60,
      align: 'center',
      render: (part: VoiceEntry['part']) =>
        part === 'content' ? (
          <Tag color="purple">{t('Voice.partContent')}</Tag>
        ) : (
          <Tag>{t('Voice.partTitle')}</Tag>
        ),
    },
    { title: 'slug', dataIndex: 'slug', width: 150, ellipsis: true },
    {
      title: t('Voice.zh'),
      dataIndex: 'zh',
      ellipsis: true,
      render: (zh: string, record) => (
        <Space size={4}>
          <span>{zh ? zh.slice(0, 20) : t('Voice.none')}</span>
          {zh && (
            <Button
              size="small"
              type="text"
              loading={previewing === `${record.id}:zh`}
              onClick={() => void handlePreview(record, 'zh')}
            >
              🔊
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: t('Voice.en'),
      dataIndex: 'en',
      ellipsis: true,
      render: (en: string, record) => (
        <Space size={4}>
          <span>{en ? en.slice(0, 28) : t('Voice.none')}</span>
          {en && (
            <Button
              size="small"
              type="text"
              loading={previewing === `${record.id}:en`}
              onClick={() => void handlePreview(record, 'en')}
            >
              🔊
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: t('Voice.genZh'),
      width: 64,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={!!checks[record.id]?.zh}
          disabled={generating || !record.zh}
          onChange={() => toggleCheck(record.id, 'zh')}
        />
      ),
    },
    {
      title: t('Voice.genEn'),
      width: 64,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={!!checks[record.id]?.en}
          disabled={generating || !record.en}
          onChange={() => toggleCheck(record.id, 'en')}
        />
      ),
    },
    {
      title: t('Voice.status'),
      width: 92,
      align: 'center',
      render: (_, record) =>
        record.zhOk && record.enOk ? (
          <Tag color="green">{t('Voice.stDone')}</Tag>
        ) : record.zhOk || record.enOk ? (
          <Tag color="orange">{t('Voice.stPartial')}</Tag>
        ) : (
          <Tag>{t('Voice.stPending')}</Tag>
        ),
    },
  ];

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        padding: 12,
        gap: 8,
        boxSizing: 'border-box',
      }}
    >
      {/* 顶栏：项目 / 章节 / 音色 */}
      <Space wrap size="small" style={{ flexShrink: 0 }}>
        <Text strong>{t('Voice.project')}:</Text>
        <Select
          value={project || undefined}
          options={projects.map((p) => ({ value: p.name, label: p.name }))}
          onChange={(v) => {
            setProject(v);
            void loadProject(v);
          }}
          disabled={generating || loading}
          style={{ width: 190 }}
        />
        <Select
          value={chapterFilter || undefined}
          options={[
            { value: '', label: t('Voice.allChapters') },
            ...chapters.map((c) => ({ value: c.name, label: `${c.name} / ${c.en}` })),
          ]}
          onChange={setChapterFilter}
          disabled={generating || loading}
          style={{ width: 230 }}
          placeholder={t('Voice.allChapters')}
        />
        <Select
          value={statusFilter}
          options={[
            { value: 'all', label: t('Voice.filterAll') },
            { value: 'pending', label: t('Voice.filterPending') },
            { value: 'partial', label: t('Voice.filterPartial') },
            { value: 'done', label: t('Voice.filterDone') },
          ]}
          onChange={(v) => setStatusFilter(v)}
          disabled={generating || loading}
          style={{ width: 110 }}
        />
        <Text strong>{t('Voice.zhVoice')}:</Text>
        <Select
          value={zhVoice}
          options={zhOptions}
          onChange={setZhVoice}
          disabled={generating}
          showSearch
          style={{ width: 240 }}
        />
        <Text strong>{t('Voice.enVoice')}:</Text>
        <Select
          value={enVoice}
          options={enOptions}
          onChange={setEnVoice}
          disabled={generating}
          showSearch
          style={{ width: 240 }}
        />
        <Button disabled={generating} onClick={() => void refreshVoices()}>
          🎛 {t('Voice.refreshVoices')}
        </Button>
      </Space>

      {/* 操作栏：全选 / 生成 / 强制重生成 */}
      <Space wrap size="small" style={{ flexShrink: 0 }}>
        <Button disabled={generating || loading} onClick={() => setAllChecks(true)}>
          {t('Voice.selectAll')}
        </Button>
        <Button disabled={generating || loading} onClick={() => setAllChecks(false)}>
          {t('Voice.deselectAll')}
        </Button>
        <Button type="primary" loading={generating} disabled={loading} onClick={() => void handleGenerate()}>
          🎙 {t('Voice.generate')}
        </Button>
        {generating && (
          <Button danger onClick={() => void handleCancel()}>
            {t('Voice.cancel')}
          </Button>
        )}
        <Checkbox checked={force} onChange={(e) => setForce(e.target.checked)} disabled={generating}>
          {t('Voice.force')}
        </Checkbox>
      </Space>

      {/* 条目表 */}
      <div className="custom-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Table
          size="small"
          columns={columns}
          dataSource={filteredEntries}
          rowKey="id"
          loading={loading}
          pagination={false}
          sticky={false}
        />
      </div>

      {/* 进度 + 状态栏 */}
      <div style={{ flexShrink: 0 }}>
        {generating && <Progress percent={pct} size="small" status="active" />}
        <div
          style={{
            fontSize: 12,
            padding: '4px 10px',
            borderRadius: 4,
            background: 'rgba(22,119,255,.12)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {t('Voice.status')}: {status || t('Voice.ready')}
        </div>
      </div>
    </div>
  );
}
