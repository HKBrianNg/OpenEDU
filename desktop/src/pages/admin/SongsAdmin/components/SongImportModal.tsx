// desktop/src/pages/admin/SongsAdmin/components/SongImportModal.tsx
import { useState, useCallback, useEffect } from 'react';
import {
  Modal, Input, Button, Space, Tag, Typography,
  Select, App, Spin, Empty, Flex, Alert, Listy
} from 'antd';
import { useLocale } from '../../../../store/LocaleContext';
import type { SearchSongItem, PreviewState, SongImportModalProps } from '../songTypes';
import { useSongSearch, useSongPreview, useSongImport } from '../hooks/songHooks';

const { Text } = Typography;

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
  open, onClose, courseId, onImported,
}: SongImportModalProps) {
  const { t } = useLocale();
  const { message: messageApi } = App.useApp();

  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [step, setStep] = useState<'search' | 'preview'>('search');
  const [selectedItem, setSelectedItem] = useState<SearchSongItem | null>(null);
  const [hotSingers, setHotSingers] = useState<{ name: string; color: string }[]>([]);

  const { results, search, loading: searchLoading } = useSongSearch(courseId);
  const { detail, loading: previewLoading, fetchDetail } = useSongPreview();
  const { importSong, loading: importLoading } = useSongImport();

  useEffect(() => {
    if (open && hotSingers.length === 0) setHotSingers(DEFAULT_HOT_SINGERS);
    if (!open) setHotSingers([]);
  }, [open]); // eslint-disable-line

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 歌词字段兼容：lyrics / lrc / plainLyrics
  // PreviewState 被真实消费 → ts613 消
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const getLyricsText = useCallback((d: PreviewState | null): string => {
    if (!d) return '';
    const raw = d as PreviewState & { lrc?: string; plainLyrics?: string };
    return raw.lyrics || raw.lrc || raw.plainLyrics || '';
  }, []);

  const handleSearch = useCallback(async (kw?: string) => {
    const q = (kw ?? keyword ?? '').trim();
    if (!q) { setStep('search'); setSelectedItem(null); return; }
    setStep('search');
    setSelectedItem(null);
    await search(q);
  }, [keyword, search]);

  const handleSingerClick = useCallback((name: string) => {
    const n = name.trim();
    setKeyword(n);
    handleSearch(n);
  }, [handleSearch]);

  const handlePreview = useCallback(async (item: SearchSongItem) => {
    setSelectedItem(item);
    setStep('preview');
    await fetchDetail(courseId, item.id, item.name, item.artist);
  }, [courseId, fetchDetail]);

  const handleImport = useCallback(async () => {
    if (!selectedItem) return;
    try {
      const result = await importSong(
        selectedItem,
        courseId,
        selectedCategory || '未分类',
        {
          audioUrl: detail?.audioUrl || '',
          lyrics: getLyricsText(detail),
        }
      );
      if (result?.audioStatus === 'missing') {
        messageApi.warning('歌词已导入，音频暂未获取到，可后续补录');
      } else {
        messageApi.success(t('Songs.Import.importSuccess'));
      }
      onImported?.();
      handleClose();
    } catch (err: any) {
      messageApi.error(`${t('Songs.Import.importFailed')}：${err?.message || err}`);
    }
  }, [selectedItem, courseId, selectedCategory, detail, getLyricsText, importSong, onImported, messageApi, t]);

  const handleClose = useCallback(() => {
    setKeyword('');
    setStep('search');
    setSelectedItem(null);
    setSelectedCategory(undefined);
    onClose();
  }, [onClose]);

  const lyricsText = getLyricsText(detail);

  const canImport =
    !previewLoading &&
    !!selectedItem &&
    (!!detail?.audioUrl || !!lyricsText);

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
              onPressEnter={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                setKeyword(v);
                handleSearch(v);
              }}
              style={{ flex: 1 }}
            />
            <Button type="primary" onClick={() => handleSearch(keyword)} loading={searchLoading}>
              {t('Songs.Import.search')}
            </Button>
          </Space>

          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('Songs.Import.popularSingers')}</Text>
            <Space wrap size={[4, 4]} style={{ marginLeft: 4 }}>
              {hotSingers.map((s) => (
                <Tag key={s.name} color={s.color} style={{ cursor: 'pointer' }} onClick={() => handleSingerClick(s.name)}>
                  {s.name}
                </Tag>
              ))}
            </Space>
          </div>

          <Spin spinning={searchLoading}>
            {results.length === 0 ? (
              <Empty
                description={keyword ? t('Songs.Import.noResult') : t('Songs.Import.searchPlaceholder')}
                style={{ padding: 24 }}
              />
            ) : (
              <Listy
                items={results}
                rowKey="id"
                height={360}
                itemRender={(item: SearchSongItem) => (
                  <Flex align="center" justify="space-between" style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
                    <Flex vertical gap={2}>
                      <Text strong style={{ fontSize: 14 }}>{item.name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.artist}</Text>
                    </Flex>
                    <Button type="link" size="small" onClick={() => handlePreview(item)}>
                      {t('Songs.Import.preview')}
                    </Button>
                  </Flex>
                )}
              />
            )}
          </Spin>
        </>
      )}

      {step === 'preview' && selectedItem && (
        <>
          <Space style={{ marginBottom: 12 }}>
            <Button size="small" onClick={() => setStep('search')}>{t('Songs.Import.back')}</Button>
            <Text strong>{selectedItem.name} — {selectedItem.artist}</Text>
          </Space>

          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('Songs.Import.audioPreview')}：</Text>
            {detail?.audioUrl ? (
              <audio controls src={detail.audioUrl} style={{ width: '100%' }} />
            ) : (
              <Alert
                type={lyricsText ? 'warning' : 'error'}
                showIcon
                title={
                  lyricsText
                    ? '音频源暂不可用，歌词已就绪，可先导入后补音频'
                    : '未能获取到歌曲信息'
                }
                style={{ marginTop: 4 }}
              />
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('Songs.Import.lyricsPreview')}：</Text>
            <div style={{ maxHeight: 180, overflow: 'auto', background: '#fafafa', padding: 8, borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {previewLoading
                ? t('Songs.Import.loading')
                : lyricsText || t('Songs.Import.noLyrics')}
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
              disabled={!canImport}
            >
              {t('Songs.Import.import')}
            </Button>
          </Space>
        </>
      )}
    </Modal>
  );
}