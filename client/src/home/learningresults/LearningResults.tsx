// client/src/home/learningresults/LearningResults.tsx
// 学习成果：目前仅占位，具体功能待实现

import React from 'react';
import { Button, Empty, Typography } from 'antd';
import { useLocale } from '../../store/LocaleContext';

const { Title, Paragraph } = Typography;

interface LearningResultsProps {
  onExit?: () => void;
}

const LearningResults: React.FC<LearningResultsProps> = ({ onExit }) => {
  const { t } = useLocale();

  return (
    <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
      {onExit && (
        <div style={{ marginBottom: 16 }}>
          <Button
            onClick={onExit}
            style={{
              borderRadius: 99,
              border: '1px solid #d0d0d0',
              background: '#fff',
              color: '#333',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← {t('learningresults.backToLobby')}
          </Button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          {t('learningresults.title')}
        </Title>
        <Paragraph italic style={{ color: '#888', fontSize: 16, margin: 0 }}>
          {t('learningresults.description')}
        </Paragraph>
      </div>

      <Empty
        description={t('learningresults.comingSoon')}
        style={{ padding: '48px 0' }}
      />
    </div>
  );
};

export default LearningResults;
