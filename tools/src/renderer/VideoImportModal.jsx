// 从网上导入视频：搜经典动画 → 选一集 → 进目录（可选顺手抓字幕）
//
// 照着歌曲那套「从网上导入」做的：
//   搜 → 列表里挑一条 → 填年级/中英文名 → 保存
// 区别是视频这边存完还能立刻抓字幕，抓字幕的日志复用主面板那块 yt-dlp 日志区。

import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useI18n } from './LocaleProvider';

const { Text } = Typography;

/** 少儿英语常见系列（点一下就搜） */
const HOT_SERIES = [
  'Peppa Pig', 'Bluey', 'Cocomelon', 'Paw Patrol', 'Peppa Pig Chinese',
  'Maisy Mouse', 'Sesame Street', 'Super Simple Songs', 'Little Baby Bum',
  'Bing Bunny', 'Hey Duggee', 'Numberblocks', 'Alphablocks', 'Mickey Mouse Clubhouse',
  'Thomas the Tank Engine', 'Ben and Holly', 'Tayo the Little Bus', 'WordWorld',
];

export default function VideoImportModal({ open, onClose, grades, defaultGrade, onSaved }) {
  const { t } = useI18n();
  const [series, setSeries] = useState('');
  const [items, setItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const [target, setTarget] = useState(null);
  const [grade, setGrade] = useState(defaultGrade ?? '');
  const [titleEn, setTitleEn] = useState('');
  const [titleZh, setTitleZh] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [fetchSubs, setFetchSubs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const doSearch = async (name) => {
    setSeries(name);
    setSearching(true);
    setError(null);
    setResult(null);
    const res = await window.api.videoSearch({ keyword: name, limit: 12 });
    setSearching(false);
    if (!res.ok) {
      setError(res.error);
      setItems([]);
      return;
    }
    setItems(res.data ?? []);
    if ((res.data ?? []).length === 0) setError(t('VideoImport.noResult'));
  };

  const handlePick = (v) => {
    setTarget(v);
    setResult(null);
    setTitleEn(v.title);
    setTitleZh('');
    // 系列名拿当前搜索词当默认值（一般是 "Peppa Pig" 这种），可改；
    // 不能拿 v.channel 顶替 —— 那是 YouTube 频道名，跟库里的 series 不是一回事
    setSeriesName(series);
    setGrade((prev) => prev || defaultGrade || grades[0]?.value || '');
  };

  const handleSave = async () => {
    if (!target) return;
    if (!grade) {
      setResult({ ok: false, text: t('VideoImport.needGrade') });
      return;
    }
    if (!String(titleEn).trim()) {
      setResult({ ok: false, text: t('VideoImport.needTitleEn') });
      return;
    }

    setSaving(true);
    setResult(null);
    const res = await window.api.videoImportOnline({
      grade,
      url: target.url,
      titleEn: String(titleEn).trim(),
      titleZh: String(titleZh).trim(),
      series: String(seriesName).trim(),
      // 这些搜索结果里本来就有，顺手写进目录
      duration: target.duration ?? '',
      channel: target.channel ?? '',
      platform: 'YouTube',
      fetchSubs,
    });
    setSaving(false);

    if (!res.ok) {
      setResult({ ok: false, text: res.error });
      return;
    }

    // 注意别叫 t —— 那是取文案用的
    const tr = res.data.transcript;
    setResult({
      ok: true,
      text:
        tr == null
          ? `${t('VideoImport.saved')}：#${res.data.id}（${t('VideoImport.noSubsHint')}）`
          : tr.ok
            ? `${t('VideoImport.saved')}：#${res.data.id}，${t('VideoImport.gotLines')} ${tr.lines} ${t('Video.lines')} → ${tr.file}`
            : `${t('VideoImport.saved')}：#${res.data.id}，${t('VideoImport.subsFailed')}：${tr.error}`,
    });
    onSaved?.();
  };

  const closeAll = () => {
    setItems([]);
    setError(null);
    setSeries('');
    setTarget(null);
    setResult(null);
    onClose?.();
  };

  const columns = [
    {
      title: t('VideoImport.colVideo'),
      render: (_, v) => (
        <div>
          <div style={{ fontWeight: 500 }}>{v.title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {v.videoId}
            {v.channel ? ` · ${v.channel}` : ''}
          </Text>
        </div>
      ),
    },
    {
      title: t('VideoImport.colDuration'),
      width: 90,
      render: (_, v) => v.duration || <Tag>{t('VideoImport.unknown')}</Tag>,
    },
    {
      title: t('VideoImport.colActions'),
      width: 140,
      render: (_, v) => (
        <Space size={4}>
          <Button size="small" type="link" href={v.url} target="_blank" rel="noopener noreferrer">
            {t('VideoImport.open')}
          </Button>
          <Button size="small" type="primary" onClick={() => handlePick(v)}>
            {t('VideoImport.import')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal open={open} title={t('VideoImport.title')} onCancel={closeAll} width={900} footer={null}>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('VideoImport.hotSeries')}
        </Text>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 8,
            maxHeight: 120,
            overflowY: 'auto',
          }}
        >
          {HOT_SERIES.map((name) => (
            <Button
              key={name}
              size="small"
              type={series === name ? 'primary' : 'default'}
              onClick={() => doSearch(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      </div>

      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder={t('VideoImport.searchPlaceholder')}
          value={series}
          onChange={(e) => setSeries(e.target.value)}
          onPressEnter={() => doSearch(series)}
          style={{ width: 260 }}
        />
        <Button type="primary" loading={searching} onClick={() => doSearch(series)}>
          {t('VideoImport.search')}
        </Button>
      </Space>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

      <Table
        rowKey="videoId"
        size="small"
        loading={searching}
        columns={columns}
        dataSource={items}
        pagination={false}
        scroll={{ y: 260 }}
        locale={{ emptyText: t('VideoImport.empty') }}
      />

      <Modal
        open={Boolean(target)}
        title={`${t('VideoImport.import')}「${target?.title ?? ''}」`}
        onCancel={() => setTarget(null)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t('VideoImport.save')}
        cancelText={t('Common.cancel')}
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: 16 }} size="middle">
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{t('VideoImport.gradeLabel')}</div>
            <Select
              value={grade}
              onChange={setGrade}
              style={{ width: '100%' }}
              options={grades}
              placeholder={t('VideoImport.gradePlaceholder')}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{t('VideoImport.titleEnLabel')}</div>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{t('VideoImport.titleZhLabel')}</div>
            <Input value={titleZh} onChange={(e) => setTitleZh(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{t('VideoImport.seriesLabel')}</div>
            <Input value={seriesName} onChange={(e) => setSeriesName(e.target.value)} />
          </div>
          <Checkbox checked={fetchSubs} onChange={(e) => setFetchSubs(e.target.checked)}>
            {t('VideoImport.fetchSubs')}
          </Checkbox>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {target?.duration ? `${t('VideoImport.durationPrefix')} ${target.duration} · ` : ''}
            {target?.url}
          </Text>
          {result && (
            <Alert type={result.ok ? 'success' : 'error'} showIcon message={result.text} />
          )}
        </Space>
      </Modal>
    </Modal>
  );
}
