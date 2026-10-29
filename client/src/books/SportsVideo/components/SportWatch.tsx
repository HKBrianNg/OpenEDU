// client/src/books/SportsVideo/components/SportWatch.tsx
//
// 站内观看页：iframe 内嵌播放 + 标题简介 + 去原站看。
// 没有台词栏，也不需要 YouTube IFrame API（EnglishVideo 那是为台词同步用的）。

import { Button, Typography } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
// 复用英文短片那套转换：只认真实视频 ID，搜索页和占位链接一律降级
import { toEmbedUrl } from '../../EnglishVideo/utils/embedUrl';
import type { SportItem } from '../types';

const { Title, Paragraph, Text } = Typography;

interface SportWatchProps {
  item: SportItem;
  /** 在列表里的位置（从 1 开始）与总数，用来显示「3 / 11」 */
  index?: number;
  total?: number;
  /** 有没有上/下一集 —— 系列课就靠这两个按顺序往下走 */
  onPrev?: () => void;
  onNext?: () => void;
  onBack: () => void;
}

export default function SportWatch({
  item,
  index,
  total,
  onPrev,
  onNext,
  onBack,
}: SportWatchProps) {
  const { locale, t } = useLocale();
  const isZh = locale === 'zh';
  const embed = toEmbedUrl(item.url);
  const name = isZh && item.chineseName ? item.chineseName : item.englishName;
  const desc = isZh ? item.description : item.descriptionEn || item.description;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Button onClick={onBack} style={{ borderRadius: 99 }}>
          ← {t('sportsVideo.back')}
        </Button>
        {index && total ? (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {index} / {total}
          </Text>
        ) : null}
      </div>

      <Title level={4} style={{ marginBottom: 12 }}>
        {name}
      </Title>

      {embed ? (
        <iframe
          key={embed}
          src={embed}
          title={item.englishName}
          // 站内的 <meta name="referrer" content="no-referrer">（为绕 raw.githubusercontent
          // 防盗链）会把 Referer 掐掉，而 YouTube 要求嵌入方提供 Referer，
          // 缺失会直接播不了（error 153）。元素上的 referrerPolicy 优先级更高，这里覆盖回来。
          referrerPolicy="strict-origin-when-cross-origin"
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            border: 0,
            borderRadius: 12,
            background: '#000',
            display: 'block',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 12,
            border: '1px dashed #d0d0d0',
            background: '#fafbfc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            textAlign: 'center',
            padding: 20,
            boxSizing: 'border-box',
          }}
        >
          <Text strong style={{ fontSize: 15 }}>
            {t('sportsVideo.cannotEmbed')}
          </Text>
          <Button
            type="primary"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ borderRadius: 99 }}
          >
            {t('sportsVideo.openOriginal')} ↗
          </Button>
        </div>
      )}

      <Paragraph style={{ color: '#555', marginTop: 14, marginBottom: 6 }}>
        {desc}
      </Paragraph>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {[item.channel, item.platform].filter(Boolean).join(' · ')}
      </Text>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {onPrev && (
          <Button onClick={onPrev} style={{ borderRadius: 99 }}>
            ← {t('sportsVideo.prev')}
          </Button>
        )}
        {onNext && (
          <Button type="primary" onClick={onNext} style={{ borderRadius: 99 }}>
            {t('sportsVideo.next')} →
          </Button>
        )}
        <Button
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ borderRadius: 99 }}
        >
          {t('sportsVideo.openOriginal')} ↗
        </Button>
      </div>
    </div>
  );
}
