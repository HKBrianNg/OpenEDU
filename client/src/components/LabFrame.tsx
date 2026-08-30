import React, { useState } from 'react';
import { Card, Empty } from 'antd';
import LabManager from '../utils/LabManager';
import type { LabEntry } from '../utils/LabManager';
import { useLocale } from '../store/LocaleContext';

const LabFrame: React.FC = () => {
  const { t } = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const labs = LabManager.getAll();
  const selectedLab: LabEntry | undefined = selectedId
    ? LabManager.get(selectedId)
    : undefined;

  const resolveText = (value: string | ((t: (key: string) => string) => string)): string => {
    if (typeof value === 'function') {
      return value(t);
    }
    return value;
  };

  if (selectedLab) {
    const LabComponent = selectedLab.component;
    return (
      <div style={{ padding: 12 }}>
        <LabComponent onExit={() => setSelectedId(null)} />
      </div>
    );
  }

  if (labs.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Empty description="暂无实验室" />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 12px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {labs.map((lab) => (
          <Card
            key={lab.id}
            hoverable
            cover={
              <div
                style={{
                  height: 140,
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                }}
              >
                {lab.icon}
              </div>
            }
            onClick={() => setSelectedId(lab.id)}
          >
            <Card.Meta
              title={resolveText(lab.title)}
              description={lab.description ? resolveText(lab.description) : ''}
            />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LabFrame;