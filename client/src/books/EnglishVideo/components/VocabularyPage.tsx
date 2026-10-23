// client/src/books/EnglishVideo/components/VocabularyPage.tsx
//
// 全年级生字总表：52 集合在一起，按频次排。
// 从年级列表点顶部「生字表」进来，返回按钮回列表。

import { Alert, Button, Typography } from 'antd';
import { useLocale } from '../../../store/LocaleContext';
import type { VocabularyWord } from '../types';
import VocabularyList from './VocabularyList';

const { Title, Text } = Typography;

interface VocabularyPageProps {
  words: VocabularyWord[];
  loading: boolean;
  /** 已释义词条数，用来提示还有多少在补 */
  glossed: number;
  onBack: () => void;
}

export default function VocabularyPage({
  words,
  loading,
  glossed,
  onBack,
}: VocabularyPageProps) {
  const { locale, t } = useLocale();
  // i18n 的 t() 只吃 key，不支持传参，所以带 {n} 的文案自己替换
  const fmt = (key: string, n: number) => t(key).replace('{n}', String(n));

  const pending = words.length - glossed;

  return (
    <div style={{ padding: 20, maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={onBack} style={{ borderRadius: 99, marginBottom: 12 }}>
          ← {t('englishVideo.backToList')}
        </Button>
        <Title level={3} style={{ marginBottom: 4 }}>
          {t('englishVideo.vocabTitle')}
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {fmt('englishVideo.vocabCount', words.length)}
        </Text>
      </div>

      {pending > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            locale === 'zh'
              ? `已收录 ${glossed} 条释义，还有 ${pending} 条待补充（显示灰色「待补充」的就是）`
              : `${glossed} entries have meanings, ${pending} still pending`
          }
        />
      )}

      <VocabularyList words={words} loading={loading} />
    </div>
  );
}
