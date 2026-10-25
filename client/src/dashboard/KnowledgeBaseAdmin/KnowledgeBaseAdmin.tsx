// client/src/dashboard/KnowledgeBaseAdmin/KnowledgeBaseAdmin.tsx
// 仪表板卡片：挑出要换真图的条目，导出待生成清单。
//
// 生成动作本身不在这里 —— 生图要调云端服务（20 积分/张，需账号凭证），
// 浏览器拿不到。本页负责「选哪些 + 看进度 + 导出清单」，清单交给 CodeBuddy
// 生成、回写 imageUrl 后，刷新本页就会自动从「emoji」变成「有真图」。

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { useLocale } from '../../store/LocaleContext';
import { STORAGE_KEYS, storage } from '../../utils/storage';
import { useKnowledgeCatalog } from './hooks/useKnowledgeCatalog';
import type { CatalogRow, ImageTaskFile, ImageTaskItem } from './types';

/** 单张图的积分单价（实测：生成 1 张扣 20 积分） */
const CREDITS_PER_IMAGE = 20;

interface KnowledgeBaseAdminProps {
  onExit?: () => void;
}

function buildTaskFile(rows: CatalogRow[]): ImageTaskFile {
  return {
    courseId: 'KnowledgeBase',
    creditsPerImage: CREDITS_PER_IMAGE,
    generatedAt: new Date().toISOString(),
    items: rows.map<ImageTaskItem>((r) => ({
      chapter: r.chapterName,
      contentLink: r.contentLink,
      title: r.titleZh,
      titleEn: r.titleEn,
      file: `${r.titleZh}.jpg`,
    })),
  };
}

export default function KnowledgeBaseAdmin({ onExit }: KnowledgeBaseAdminProps) {
  const { t } = useLocale();
  const { message } = App.useApp();
  const { rows, loading, error } = useKnowledgeCatalog();

  // 勾选状态落 localStorage：关掉页面再回来，之前挑的还在
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    () => storage.get<string[]>(STORAGE_KEYS.knowledgeBaseImageTasks) ?? []
  );
  const [chapterFilter, setChapterFilter] = useState<string>('__all__');
  const [keyword, setKeyword] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(true);

  // 生成配图要真花钱（20 积分/张），所以加一道 hh+mm 验证防误点
  // —— 与歌曲管理「从 CDN 导入」的做法保持一致
  const [passModal, setPassModal] = useState<{
    open: boolean;
    code: string;
    hh: number;
    mm: number;
    sum: number;
  }>({ open: false, code: '', hh: 0, mm: 0, sum: 0 });
  const [submitting, setSubmitting] = useState(false);

  const openGenerateModal = () => {
    const d = new Date();
    const hh = d.getHours();
    const mm = d.getMinutes();
    setPassModal({ open: true, code: '', hh, mm, sum: hh + mm });
  };

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      // 必须裸 fetch：api.post 会拼 VITE_API_BASE_URL（worker:8787），
      // 而这个端点由 Vite dev server 提供，只在 npm run dev 下存在
      const res = await fetch('/__local/save-kb-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTaskFile(selectedRows)),
      });
      const json = (await res.json()) as { ok?: boolean; path?: string; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setPassModal((s) => ({ ...s, open: false }));
      message.success(`${t('Dashboard.KnowledgeBaseAdmin.generateSubmitted')}：${json.path}`);
    } catch (err: unknown) {
      message.error(
        `${t('Dashboard.KnowledgeBaseAdmin.generateFailed')}：${
          err instanceof Error ? err.message : ''
        }`
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    storage.set(STORAGE_KEYS.knowledgeBaseImageTasks, selectedKeys);
  }, [selectedKeys]);

  // 必须是稳定的引用：rows 为 null 时每次渲染都会造一个新数组，让下游 useMemo 全部失效
  const all = useMemo(() => rows ?? [], [rows]);

  const chapters = useMemo(() => {
    const seen = new Map<string, { label: string; color: string }>();
    for (const r of all) {
      if (!seen.has(r.contentLink)) {
        seen.set(r.contentLink, { label: r.chapterName, color: r.chapterColor });
      }
    }
    return [...seen.entries()].map(([value, meta]) => ({ value, ...meta }));
  }, [all]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return all.filter((r) => {
      if (chapterFilter !== '__all__' && r.contentLink !== chapterFilter) return false;
      if (onlyMissing && r.hasImage) return false;
      if (kw && !`${r.titleZh} ${r.titleEn}`.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [all, chapterFilter, keyword, onlyMissing]);

  const doneCount = useMemo(() => all.filter((r) => r.hasImage).length, [all]);
  const percent = all.length ? Math.round((doneCount / all.length) * 100) : 0;

  // 已选里可能有已经配好图的（比如之前选过、后来图补上了），导出前过滤掉
  // 不用 useMemo：192 条过滤开销可忽略，手写 memo 反而让 React Compiler 保不住而报错
  const selectedSet = new Set(selectedKeys);
  const selectedRows = all.filter((r) => selectedSet.has(r.key) && !r.hasImage);

  const columns: TableColumnsType<CatalogRow> = [
    {
      title: t('Dashboard.KnowledgeBaseAdmin.colChapter'),
      dataIndex: 'chapterName',
      width: 110,
      render: (_: unknown, r: CatalogRow) => (
        <Tag color={r.chapterColor} style={{ borderRadius: 99 }}>
          {r.chapterName}
        </Tag>
      ),
    },
    {
      title: t('Dashboard.KnowledgeBaseAdmin.colIcon'),
      dataIndex: 'icon',
      width: 60,
      align: 'center',
      render: (icon: string) => <span style={{ fontSize: 20 }}>{icon}</span>,
    },
    {
      title: t('Dashboard.KnowledgeBaseAdmin.colTitle'),
      dataIndex: 'titleZh',
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: t('Dashboard.KnowledgeBaseAdmin.colTitleEn'),
      dataIndex: 'titleEn',
      responsive: ['lg'],
      render: (v: string) => <span style={{ color: '#999', fontSize: 12 }}>{v}</span>,
    },
    {
      title: t('Dashboard.KnowledgeBaseAdmin.colStatus'),
      dataIndex: 'hasImage',
      width: 100,
      render: (has: boolean) =>
        has ? (
          <Tag color="green">{t('Dashboard.KnowledgeBaseAdmin.statusImage')}</Tag>
        ) : (
          <Tag>{t('Dashboard.KnowledgeBaseAdmin.statusEmoji')}</Tag>
        ),
    },
  ];

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
        <h1 style={{ margin: 0 }}>{t('Dashboard.KnowledgeBaseAdmin.title')}</h1>
        {/* 返回仪表板统一放在头部最右（固定不随页面滚动），这里不再重复放一个 */}
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderRadius: 12 }}
        message={t('Dashboard.KnowledgeBaseAdmin.flowHint')}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
            {t('Dashboard.KnowledgeBaseAdmin.statTotal')} {all.length} ·{' '}
            {t('Dashboard.KnowledgeBaseAdmin.statDone')} {doneCount} ·{' '}
            {t('Dashboard.KnowledgeBaseAdmin.statTodo')} {all.length - doneCount}
          </div>
          <Progress percent={percent} size="small" />
        </div>
      </div>

      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          value={chapterFilter}
          onChange={setChapterFilter}
          style={{ width: 160 }}
          options={[
            { value: '__all__', label: t('Dashboard.KnowledgeBaseAdmin.allChapters') },
            ...chapters.map((c) => ({ value: c.value, label: c.label })),
          ]}
        />
        <Input
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={t('Dashboard.KnowledgeBaseAdmin.searchPlaceholder')}
          style={{ width: 200 }}
        />
        <Checkbox checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)}>
          {t('Dashboard.KnowledgeBaseAdmin.onlyMissing')}
        </Checkbox>
        <Button
          onClick={() =>
            setSelectedKeys((prev) => [
              ...new Set([...prev, ...filtered.map((r) => r.key)]),
            ])
          }
        >
          {t('Dashboard.KnowledgeBaseAdmin.selectFiltered')}
        </Button>
        <Button onClick={() => setSelectedKeys([])}>
          {t('Dashboard.KnowledgeBaseAdmin.clearSelection')}
        </Button>
      </Space>

      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={t('Dashboard.KnowledgeBaseAdmin.fetchFailed')}
          description={error}
        />
      )}

      <Table<CatalogRow>
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
          {t('Dashboard.KnowledgeBaseAdmin.selectedPrefix')} <b>{selectedRows.length}</b>{' '}
          {t('Dashboard.KnowledgeBaseAdmin.selectedSuffix')}{' '}
          <span style={{ color: '#888' }}>
            ≈ {selectedRows.length * CREDITS_PER_IMAGE} {t('Dashboard.KnowledgeBaseAdmin.credits')}
          </span>
        </span>
        <Button
          type="primary"
          disabled={selectedRows.length === 0}
          style={{ borderRadius: 99 }}
          onClick={openGenerateModal}
        >
          {t('Dashboard.KnowledgeBaseAdmin.generate')}
        </Button>
      </div>

      {/* 生成配图验证弹窗：要求输入当前时间 hh+mm（防误点，因为要真扣积分） */}
      <Modal
        title={t('Dashboard.KnowledgeBaseAdmin.generatePasscodeTitle')}
        open={passModal.open}
        onCancel={() => setPassModal((s) => ({ ...s, open: false }))}
        onOk={() => void handleGenerate()}
        okText={t('Dashboard.KnowledgeBaseAdmin.confirm')}
        cancelText={t('Dashboard.KnowledgeBaseAdmin.cancel')}
        okButtonProps={{
          disabled: Number(passModal.code) !== passModal.sum,
          loading: submitting,
        }}
        destroyOnHidden
      >
        <p style={{ marginBottom: 12 }}>
          {t('Dashboard.KnowledgeBaseAdmin.generatePasscodeDescription')}
        </p>
        <p style={{ marginBottom: 12, fontWeight: 600, fontSize: 18 }}>
          {String(passModal.hh).padStart(2, '0')}:{String(passModal.mm).padStart(2, '0')}
        </p>
        <Input
          value={passModal.code}
          onChange={(e) => setPassModal((s) => ({ ...s, code: e.target.value }))}
          onPressEnter={() => {
            if (Number(passModal.code) === passModal.sum) void handleGenerate();
          }}
          placeholder={t('Dashboard.KnowledgeBaseAdmin.generatePasscodePlaceholder')}
        />
      </Modal>
    </div>
  );
}
