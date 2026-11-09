import { Alert, Spin, Typography, Button, Space, Segmented } from 'antd';
import { LeftOutlined, RightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useSportVideo } from './hooks/useSportVideo';
import { SportCard } from './components/SportCard';

const { Title, Text, Paragraph } = Typography;

export function SportVideo() {
  const {
    locale,
    t,
    indexData,
    category,
    currentChapter,
    setCurrentChapter,
    loading,
    error,
    watchItem,
    setWatchItem,
    extractYoutubeId
  } = useSportVideo();

  if (error) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
        <Alert type="error" title={error} />
      </div>
    );
  }

  const list = category?.items ?? [];
  const watchIndex = watchItem ? list.findIndex((it) => it.id === watchItem.id) : -1;

  if (watchItem) {
    const ytId = extractYoutubeId(watchItem.url);
    const displayTitle = locale.startsWith('zh') ? watchItem.chineseName : watchItem.englishName;
    const displayDesc = locale.startsWith('zh') ? watchItem.description : watchItem.descriptionEn;

    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: 20, maxWidth: 1000, margin: '0 auto' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => setWatchItem(null)}
          style={{ marginBottom: 16 }}
        >
          返回列表
        </Button>
        {ytId ? (
          <div style={{ position: 'relative', aspectRatio: '16 / 9', marginBottom: 16 }}>
            <iframe
              title={displayTitle}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              src={`https://www.youtube.com/embed/${ytId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <Alert type="warning" title="无法解析视频链接" style={{ marginBottom: 16 }} />
        )}
        <Title level={3}>{displayTitle}</Title>
        <Paragraph>{displayDesc}</Paragraph>
        {watchIndex >= 0 && (
          <div style={{ marginBottom: 12, color: '#888' }}>
            {watchIndex + 1} / {list.length}
          </div>
        )}
        <Space>
          <Button
            disabled={watchIndex <= 0}
            icon={<LeftOutlined />}
            onClick={() => setWatchItem(list[watchIndex - 1])}
          >
            上一集
          </Button>
          <Button
            disabled={watchIndex < 0 || watchIndex >= list.length - 1}
            icon={<RightOutlined />}
            onClick={() => setWatchItem(list[watchIndex + 1])}
          >
            下一集
          </Button>
        </Space>
      </div>
    );
  }

  const pageTitle = locale.startsWith('zh')
    ? indexData?.title ?? t('sportsVideo.title')
    : indexData?.titleEn ?? t('sportsVideo.title');

  const pageDesc = locale.startsWith('zh') ? indexData?.description : indexData?.descriptionEn;
  const catTitle = locale.startsWith('zh') ? category?.title : category?.titleEn;
  const catDesc = locale.startsWith('zh') ? category?.description : category?.descriptionEn;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      padding: '20px 24px'
    }}>
      <div style={{ flexShrink: 0, maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <Title level={2} style={{ marginBottom: 4 }}>
            {pageTitle}
          </Title>
          {pageDesc && (
            <Text type="secondary" style={{ fontSize: 15 }}>
              {pageDesc}
            </Text>
          )}
        </div>

        {indexData && (
          <Segmented
            options={indexData.chapters.map((ch) => {
              const label = locale.startsWith('zh') ? ch.name : ch.en;
              return { label, value: ch.contentLink };
            })}
            value={currentChapter ?? undefined}
            onChange={(link) => {
              setWatchItem(null);
              setCurrentChapter(link);
            }}
            style={{ marginBottom: 20, width: '100%' }}
          />
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin size="large" />
            <div style={{ marginTop: 12, color: '#999' }}>{t('sportsVideo.loading')}</div>
          </div>
        )}

        {!loading && category && catTitle && (
          <div style={{ marginBottom: 18 }}>
            <Title level={3} style={{ marginBottom: 4 }}>{catTitle}</Title>
            {catDesc && (
              <Paragraph style={{ color: '#666', marginBottom: 0, fontSize: 14 }}>
                {catDesc}
              </Paragraph>
            )}
          </div>
        )}
      </div>

      {!loading && category && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            maxWidth: 1000,
            width: '100%',
            margin: '0 auto'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
              paddingBottom: 40
            }}
          >
            {list.map((item) => (
              <SportCard
                key={item.id}
                item={item}
                onClick={() => setWatchItem(item)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
