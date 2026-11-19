// desktop/src/pages/admin/SongsAdmin/components/SongImportModal.tsx

import { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  Input,
  Button,
  Space,
  List,
  Tag,
  Typography,
  Select,
  App,
  Spin,
} from 'antd';
import { useLocale } from '../../../../store/LocaleContext';
import type {
  SearchSongItem,
  PreviewState,
  SongImportModalProps,
} from '../songTypes';
import { useSongSearch, useSongPreview, useSongImport } from '../hooks/songHooks';

const { Text } = Typography;

// 默认热门歌手（方案 B：独立于搜索接口）
const DEFAULT_HOT_SINGERS = [
  { name: '周杰伦', color: '#1890ff' },
  { name: '林俊杰', color: '#52c41a' },
  { name: '邓紫棋', color: '#eb2f96' },
  { name: '陈奕迅', color: '#fa8c16' },
  { name: '薛之谦', color: '#722ed1' },
  { name: '李荣浩', color: '#13c2c2' },
  { name: '张惠妹', color: '#a0d911' },
];

export function SongImportModal({
  open,
  onClose,
  courseId,
  onImported,
}: SongImportModalProps) {
  const { t } = useLocale();
  const { message: messageApi } = App.useApp();

  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [step, setStep] = useState<'search' | 'preview'>('search');
  const [selectedItem, setSelectedItem] = useState<SearchSongItem | null>(null);

  // 方案 B：独立热门歌手状态（不再依赖搜索返回的 singers）
  const [hotSingers, setHotSingers] = useState<{ name: string; color: string }[]>([]);

  // 移除解构中的 singers，避免 ts6133 未使用警告
  const { results, search, loading: searchLoading } = useSongSearch(courseId);
  const { detail, loading: previewLoading, fetchDetail } = useSongPreview();
  const { importSong, loading: importLoading } = useSongImport();

  // 弹窗打开时初始化热门歌手
  useEffect(() => {
    if (open && hotSingers.length === 0) {
      setHotSingers(DEFAULT_HOT_SINGERS);
    }
    if (!open) {
      // 关闭时重置（配合 destroyOnHidden 也可保留）
      setHotSingers([]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(
    async (kw?: string) => {
      const q = kw ?? keyword;
      if (!q?.trim()) return;
      setStep('search');
      setSelectedItem(null);
      await search(q);
    },
    [keyword, search]
  );

  const handleSingerClick = useCallback(
    (name: string) => {
      setKeyword(name);
      handleSearch(name);
    },
    [handleSearch]
  );

  const handlePreview = useCallback(
    async (item: SearchSongItem) => {
      setSelectedItem(item);
      setStep('preview');
      await fetchDetail(item.id);
    },
    [fetchDetail]
  );

  const handleImport = useCallback(async () => {
    if (!selectedItem) return;
    try {
      await importSong(selectedItem, courseId, selectedCategory || '未分类');
      messageApi.success(t('Songs.Import.importSuccess'));
      onImported?.();
      handleClose();
    } catch (err: any) {
      messageApi.error(
        `${t('Songs.Import.importFailed')}：${err?.message || err}`
      );
    }
  }, [selectedItem, courseId, selectedCategory, importSong, onImported, messageApi, t]);

  const handleClose = useCallback(() => {
    setKeyword('');
    setStep('search');
    setSelectedItem(null);
    setSelectedCategory(undefined);
    onClose();
  }, [onClose]);

  return (
    <Modal
      title={t('Songs.Import.title')}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      {step === 'search' && (
        <>
          <Space style={{ marginBottom: 12, width: '100%' }}>
            <Input
              placeholder={t('Songs.Import.searchPlaceholder')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => handleSearch()}
              style={{ flex: 1 }}
            />
            <Button type="primary" onClick={() => handleSearch()} loading={searchLoading}>
              {t('Songs.Import.search')}
            </Button>
          </Space>

          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {/* i18n Key 已带冒号，此处不再拼接 */}
              {t('Songs.Import.popularSingers')}
            </Text>
            <Space wrap size={[4, 4]} style={{ marginLeft: 4 }}>
              {hotSingers.map((s) => (
                <Tag
                  key={s.name}
                  color={s.color}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSingerClick(s.name)}
                >
                  {s.name}
                </Tag>
              ))}
            </Space>
          </div>

          <Spin spinning={searchLoading}>
            <List
              size="small"
              bordered
              dataSource={results}
              locale={{
                emptyText: keyword
                  ? t('Songs.Import.noResult')
                  : t('Songs.Import.searchPlaceholder'),
              }}
              renderItem={(item: SearchSongItem) => (
                <List.Item
                  actions={[
                    <Button
                      key="preview"
                      type="link"
                      size="small"
                      onClick={() => handlePreview(item)}
                    >
                      {t('Songs.Import.preview')}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.name}
                    description={item.artist}
                  />
                </List.Item>
              )}
            />
          </Spin>
        </>
      )}

      {step === 'preview' && selectedItem && (
        <>
          <Space style={{ marginBottom: 12 }}>
            <Button size="small" onClick={() => setStep('search')}>
              {t('Songs.Import.back')}
            </Button>
            <Text strong>
              {selectedItem.name} — {selectedItem.artist}
            </Text>
          </Space>

          {detail?.audioUrl && (
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('Songs.Import.audioPreview')}：
              </Text>
              <audio controls src={detail.audioUrl} style={{ width: '100%' }} />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('Songs.Import.lyricsPreview')}：
            </Text>
            <div
              style={{
                maxHeight: 180,
                overflow: 'auto',
                background: '#fafafa',
                padding: 8,
                borderRadius: 4,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
              }}
            >
              {previewLoading
                ? t('Songs.Import.loading')
                : (detail as PreviewState | null)?.lyrics || t('Songs.Import.noLyrics')}
            </div>
          </div>

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Select
              placeholder={t('Songs.Import.selectCategory')}
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ width: 200 }}
              allowClear
              showSearch
              options={[
                { value: '流行', label: '流行' },
                { value: '民谣', label: '民谣' },
                { value: '说唱', label: '说唱' },
                { value: '未分类', label: '未分类' },
              ]}
            />
            <Button
              type="primary"
              loading={importLoading}
              onClick={handleImport}
              disabled={!detail?.audioUrl}
            >
              {t('Songs.Import.import')}
            </Button>
          </Space>
        </>
      )}
    </Modal>
  );
}