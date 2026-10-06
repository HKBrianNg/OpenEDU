// client/src/components/ModuleFrame.tsx
import React, { useState } from 'react';
import { Card, Empty } from 'antd';
import type { ManagerEntry } from '../utils/BaseManager';
import { useLocale } from '../store/LocaleContext';

interface ModuleFrameProps {
  manager: {
    getAll: () => ManagerEntry[];
    get: (id: string) => ManagerEntry | undefined;
  };
  emptyText?: string;
  gradient?: string;
  renderExtra?: (item: ManagerEntry) => React.ReactNode;
  getComponentProps?: (item: ManagerEntry) => Record<string, unknown>;
}

const ModuleFrame: React.FC<ModuleFrameProps> = ({
  manager,
  emptyText = '暂无内容',
  gradient = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  renderExtra,
  getComponentProps,
}) => {
  const { t } = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = manager.getAll();
  const selectedItem = selectedId ? manager.get(selectedId) : undefined;

  const resolveText = (value: string | ((t: (key: string) => string) => string)): string => {
    if (typeof value === 'function') {
      return value(t);
    }
    return value;
  };

  if (selectedItem) {
    const Component = selectedItem.component;
    const extraProps = getComponentProps ? getComponentProps(selectedItem) : {};
    return (
      <div style={{ padding: 12 }}>
        <Component onExit={() => setSelectedId(null)} {...extraProps} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Empty description={emptyText} />
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
        {items.map((item) => (
          <Card
            key={item.id}
            hoverable
            cover={
              <div
                style={{
                  height: 140,
                  background: gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                }}
              >
                {item.icon}
              </div>
            }
            onClick={() => setSelectedId(item.id)}
          >
            <Card.Meta
              title={resolveText(item.title)}
              description={item.description ? resolveText(item.description) : ''}
            />
            {renderExtra && renderExtra(item)}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ModuleFrame;