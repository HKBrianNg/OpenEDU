import React, { useState } from 'react';
import { Card, Empty } from 'antd';
import DashboardManager from '../utils/DashboardManager';
import type { DashboardEntry } from '../utils/DashboardManager';
import { useLocale } from '../store/LocaleContext';

const DashboardFrame: React.FC = () => {
  const { t } = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const Dashboards = DashboardManager.getAll();
  const selectedDashboard: DashboardEntry | undefined = selectedId
    ? DashboardManager.get(selectedId)
    : undefined;

  const resolveText = (value: string | ((t: (key: string) => string) => string)): string => {
    if (typeof value === 'function') {
      return value(t);
    }
    return value;
  };

  if (selectedDashboard) {
    const DashboardComponent = selectedDashboard.component;
    return (
      <div style={{ padding: 12 }}>
        <DashboardComponent onExit={() => setSelectedId(null)} />
      </div>
    );
  }

  if (Dashboards.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Empty description="暂无书" />
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
        {Dashboards.map((Dashboard) => (
          <Card
            key={Dashboard.id}
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
                {Dashboard.icon}
              </div>
            }
            onClick={() => setSelectedId(Dashboard.id)}
          >
            <Card.Meta
              title={resolveText(Dashboard.title)}
              description={Dashboard.description ? resolveText(Dashboard.description) : ''}
            />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardFrame;