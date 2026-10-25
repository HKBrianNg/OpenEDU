// 视频字幕管理
//
// 抓字幕这件事本身不在这里 —— 它要靠 yt-dlp 跑命令行，浏览器（以及 Cloudflare
// Worker）都做不到。本页负责「看进度 + 选哪些 + 导出清单」，清单交给 CodeBuddy
// 去抓字幕、写中文、回写 transcripts/，刷新本页就会从「缺台词」变成「N 句」。
//
// 与知识库配图（KnowledgeBaseAdmin）是同一套路：浏览器端只做挑选和导出。

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { useLocale } from '../../store/LocaleContext';
import { STORAGE_KEYS, storage } from '../../utils/storage';
import { useVideoCatalog } from './hooks/useVideoCatalog';
import type { TranscriptTaskFile, TranscriptTaskItem, VideoRow } from './types';

interface VideoTranscriptAdminProps {
  onExit?: () => void;
}

/**
 * 从英文标题推一个台词文件名，规则跟幼儿园那批一致：
 * "Peppa Pig: Muddy Puddles" → "PeppaPigMuddyPuddles.json"
 */
function suggestFileName(titleEn: string, id: number): string {
  const words = titleEn.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length === 0) return `Item${id}.json`;
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join('') + '.json';
}

const VideoTranscriptAdmin: React.FC<VideoTranscriptAdminProps> = ({ onExit }) => {
  const { t } = useLocale();
  const { rows: all, loading, error } = useVideoCatalog();

  // 勾选状态落 localStorage：关掉页面再回来，之前挑的还在
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    () => storage.get<string[]>(STORAGE_KEYS.videoTranscriptTasks) ?? []
  );
  const [gradeFilter, setGradeFilter] = useState<string>('__all__');
  const [keyword, setKeyword] = useState('');
  const [onlyMissingTranscript, setOnlyMissingTranscript] = useState(true);
  const [onlyMissingUrl, setOnlyMissingUrl] = useState(false);

  useEffect(() => {
    storage.set(STORAGE_KEYS.videoTranscriptTasks, selectedKeys);
  }, [selectedKeys]);

  // 必须是稳定的引用：rows 为 null 时每次渲染都会造一个新数组，让下游 useMemo 全部失效
  const rows = all ?? [];

  const grades = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.grade, r.gradeName));
    return [...m.entries()].map(([value, label]) => ({ value, label }));
  }, [rows]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter((r) => {
      if (gradeFilter !== '__all__' && r.grade !== gradeFilter) return false;
      if (onlyMissingTranscript && r.hasTranscript) return false;
      if (onlyMissingUrl && r.url) return false;
      if (kw && !`${r.titleEn} ${r.titleZh} ${r.url}`.toLowerCase().includes(kw)) {
        return false;
      }
      return true;
    });
  }, [rows, gradeFilter, keyword, onlyMissingTranscript, onlyMissingUrl]);

  const doneCount = useMemo(() => rows.filter((r) => r.hasTranscript).length, [rows]);
  const percent = rows.length ? Math.round((doneCount / rows.length) * 100) : 0;

  // 已选里可能有已经补上台词的（之前选过、后来补上了），导出前过滤掉
  const selectedSet = new Set(selectedKeys);
  const selectedRows = rows.filter((r) => selectedSet.has(r.key) && !r.hasTranscript);

  const columns: TableColumnsType<VideoRow> = [
    {
      title: t('Dashboard.VideoTranscriptAdmin.colGrade'),
      dataIndex: 'gradeName',
      width: 90,
    },
    {
      title: '#',
      dataIndex: 'id',
      width: 50,
    },
    {
      title: t('Dashboard.VideoTranscriptAdmin.colTitle'),
      dataIndex: 'titleEn',
      render: (_: unknown, r: VideoRow) =>
        r.titleEn || <span style={{ color: '#bbb' }}>{t('Dashboard.VideoTranscriptAdmin.untitled')}</span>,
    },
    {
      title: t('Dashboard.VideoTranscriptAdmin.colZh'),
      dataIndex: 'titleZh',
      width: 160,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      width: 200,
      render: (url: string) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 32)}
          </a>
        ) : (
          <Tag color="orange">{t('Dashboard.VideoTranscriptAdmin.noUrl')}</Tag>
        ),
    },
    {
      title: t('Dashboard.VideoTranscriptAdmin.colStatus'),
      dataIndex: 'hasTranscript',
      width: 110,
      render: (has: boolean, r: VideoRow) =>
        has ? (
          <Tag color="green">{t('Dashboard.VideoTranscriptAdmin.statusDone')} {r.lineCount}</Tag>
        ) : (
          <Tag>{t('Dashboard.VideoTranscriptAdmin.statusTodo')}</Tag>
        ),
    },
  ];

  const handleExport = () => {
    if (selectedRows.length === 0) return;
    const file: TranscriptTaskFile = {
      courseId: 'EnglishVideo',
      generatedAt: new Date().toISOString(),
      dataRoot: 'public/data/EnglishVideo',
      items: selectedRows.map<TranscriptTaskItem>((r) => {
        const file = r.transcriptFile || `transcripts/${suggestFileName(r.titleEn, r.id)}`;
        return {
          grade: r.grade,
          gradeName: r.gradeName,
          id: r.id,
          titleEn: r.titleEn,
          titleZh: r.titleZh,
          url: r.url,
          transcriptFile: file,
          targetPath: `public/data/EnglishVideo/${r.grade}/${file}`,
        };
      }),
    };
    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-tasks-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    void message.success(t('Dashboard.VideoTranscriptAdmin.exported'));
  };

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0 }}>{t('Dashboard.VideoTranscriptAdmin.title')}</h1>
        {/* 返回仪表板统一放在头部最右（固定不随页面滚动），这里不再重复放一个 */}
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderRadius: 12 }}
        message={t('Dashboard.VideoTranscriptAdmin.flowHint')}
      />

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
          {t('Dashboard.VideoTranscriptAdmin.statTotal')} {rows.length} ·{' '}
          {t('Dashboard.VideoTranscriptAdmin.statDone')} {doneCount} ·{' '}
          {t('Dashboard.VideoTranscriptAdmin.statTodo')} {rows.length - doneCount}
        </div>
        <Progress percent={percent} size="small" />
      </div>

      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          value={gradeFilter}
          onChange={setGradeFilter}
          style={{ width: 160 }}
          options={[
            { value: '__all__', label: t('Dashboard.VideoTranscriptAdmin.allGrades') },
            ...grades,
          ]}
        />
        <Input
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={t('Dashboard.VideoTranscriptAdmin.searchPlaceholder')}
          style={{ width: 220 }}
        />
        <Checkbox
          checked={onlyMissingTranscript}
          onChange={(e) => setOnlyMissingTranscript(e.target.checked)}
        >
          {t('Dashboard.VideoTranscriptAdmin.onlyMissing')}
        </Checkbox>
        <Checkbox
          checked={onlyMissingUrl}
          onChange={(e) => setOnlyMissingUrl(e.target.checked)}
        >
          {t('Dashboard.VideoTranscriptAdmin.onlyMissingUrl')}
        </Checkbox>
        <Button
          onClick={() =>
            setSelectedKeys((prev) => [...new Set([...prev, ...filtered.map((r) => r.key)])])
          }
        >
          {t('Dashboard.VideoTranscriptAdmin.selectFiltered')}
        </Button>
        <Button onClick={() => setSelectedKeys([])}>
          {t('Dashboard.VideoTranscriptAdmin.clearSelection')}
        </Button>
      </Space>

      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={t('Dashboard.VideoTranscriptAdmin.fetchFailed')}
          description={error}
        />
      )}

      <Table<VideoRow>
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        rowKey="key"
        pagination={{ pageSize: 20, showSizeChanger: false, size: 'small' }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => setSelectedKeys(keys as string[]),
        }}
      />

      <div
        style={{
          marginTop: 16,
          padding: '12px 16px',
          borderRadius: 12,
          background: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 14 }}>
          {t('Dashboard.VideoTranscriptAdmin.selectedPrefix')} <b>{selectedRows.length}</b>{' '}
          {t('Dashboard.VideoTranscriptAdmin.selectedSuffix')}
        </span>
        <Button
          type="primary"
          disabled={selectedRows.length === 0}
          style={{ borderRadius: 99 }}
          onClick={handleExport}
        >
          {t('Dashboard.VideoTranscriptAdmin.export')}
        </Button>
      </div>
    </div>
  );
};

export default VideoTranscriptAdmin;
