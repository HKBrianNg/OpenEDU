// desktop/src/pages/admin/SongsAdmin/components/SongImportModal.tsx
import { useState, useCallback } from 'react';
import {
  Modal, Input, Button, Space, Tag, Typography,
  Select, App, Spin, Empty, Flex, Alert, Listy
} from 'antd';
import { useLocale } from '../../../../store/LocaleContext';
import type { SearchSongItem, PreviewState, SongImportModalProps } from '../songTypes';
import { useSongSearch, useSongPreview, useSongImport } from '../hooks/songHooks';
// 分类必须与学生端 data.json 的真实分类名一致（学生端按 c.name 精确匹配），
// 否则会造出「流行」「未分类」这类学生端不显示的孤儿分类
import { SONG_CATEGORY } from '../../../music/shared/categories';
// 热门歌手按课程区分（中文曲显中文歌手、英文曲显英文歌手），配置外置成 JSON 便于维护
import hotSingersConfig from '../config/hotSingers.json';

const { Text } = Typography;

const HOT_SINGERS = hotSingersConfig as Record<
  string,
  { name: string; color: string }[]
>;

export function SongImportModal({
  open, onClose, courseId, onImported,
}: SongImportModalProps) {
  const { t } = useLocale();
  const { message: messageApi } = App.useApp();

  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [step, setStep] = useState<'search' | 'preview'>('search');
  const [selectedItem, setSelectedItem] = useState<SearchSongItem | null>(null);

  const { results, search, loading: searchLoading } = useSongSearch(courseId);
  const { detail, loading: previewLoading, fetchDetail } = useSongPreview();
  const { importSong, loading: importLoading } = useSongImport();

  const hotSingers = HOT_SINGERS[courseId] ?? [];

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
        selectedCategory || SONG_CATEGORY.pop,
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

  // 预览失败也允许尝试导入：导入时主进程会重新解析（含 API 直连兜底）
  const canImport =
    !previewLoading && !!selectedItem && !!selectedCategory;

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
                    : '未能获取到歌曲信息（仍可尝试导入）'
                }
                description={detail?.audioMsg ? String(detail.audioMsg) : undefined}
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
                { value: SONG_CATEGORY.nursery, label: SONG_CATEGORY.nursery },
                { value: SONG_CATEGORY.pop, label: SONG_CATEGORY.pop },
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