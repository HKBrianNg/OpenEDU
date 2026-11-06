import { Grid } from 'antd';
import type { PrimaryMenuItem } from '../config/primaryMenu';
import { primaryMenu } from '../config/primaryMenu';
import { ModuleCard } from '../components/ModuleCard';
import { isFeatureEnabled } from '../utils/featureRegistry';
import * as Icons from '@ant-design/icons';
import type { FC } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { useBreakpoint } = Grid;
type AntIcon = FC<{ style?: React.CSSProperties }>;

export function Home() {
  const screens = useBreakpoint();
  const cols = screens.xs ? 1 : screens.sm ? 2 : screens.md ? 3 : 5;

  const visibleItems: PrimaryMenuItem[] = primaryMenu.filter(item => isFeatureEnabled(item.featureId));

  const getIcon = (iconName: string): AntIcon => {
    const maybeIcon = (Icons as Record<string, unknown>)[iconName];
    if (typeof maybeIcon === 'function') {
      return maybeIcon as AntIcon;
    }
    return QuestionCircleOutlined;
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(160px, 1fr))`,
          gap: 16
        }}
      >
        {visibleItems.map(item => {
          const IconCmp = getIcon(item.icon);
          return (
            <ModuleCard
              key={item.featureId}
              title={item.label}
              description={item.description}
              gradient={item.cardGradient}
              icon={<IconCmp style={{ fontSize: 32, color: '#fff' }} />}
              route={item.route}
            />
          );
        })}
      </div>
    </div>
  );
}
