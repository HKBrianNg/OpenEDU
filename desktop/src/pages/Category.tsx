// src/pages/Category.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { Grid, Empty, Button } from 'antd';
import type { SubModule, PrimaryMenuItem } from '../config/primaryMenu';
import { primaryMenu } from '../config/primaryMenu';
import { ModuleCard } from '../components/ModuleCard';
import { isFeatureEnabled } from '../utils/featureRegistry';
import * as Icons from '@ant-design/icons';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { FC } from 'react';

const { useBreakpoint } = Grid;
type AntIcon = FC<{ style?: React.CSSProperties }>;

export function Category() {
  const navigate = useNavigate();
  const { routePath } = useParams<{ routePath: string }>();
  const screens = useBreakpoint();
  const cols = screens.xs ? 1 : screens.sm ? 2 : screens.md ? 3 : 5;

  const targetRoute = `/${routePath}`;
  const currentEntry: PrimaryMenuItem | undefined = primaryMenu.find(item => item.route === targetRoute);

  if (!currentEntry) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Empty description="该分类不存在" />
        <Button onClick={() => navigate('/')} style={{ marginTop: 16 }}>返回首页</Button>
      </div>
    );
  }

  const visibleSubModules: SubModule[] = currentEntry.children.filter(sub => isFeatureEnabled(sub.featureId));

  const getIcon = (iconName: string): AntIcon => {
    const maybeIcon = (Icons as Record<string, unknown>)[iconName];
    if (typeof maybeIcon === 'function') {
      return maybeIcon as AntIcon;
    }
    return QuestionCircleOutlined;
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 24 }}>{currentEntry.label}</h2>
      {visibleSubModules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Empty description="该板块暂时没有功能" />
          <Button onClick={() => navigate('/')} style={{ marginTop: 16 }}>返回首页</Button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(160px, 1fr))`,
            gap: 16
          }}
        >
          {visibleSubModules.map(sub => {
            const IconCmp = getIcon(sub.icon);
            return (
              <ModuleCard
                key={sub.featureId}
                title={sub.label}
                description={sub.description}
                gradient="linear-gradient(135deg,#4064b2,#283e70)"
                icon={<IconCmp style={{ fontSize: 32, color: '#fff' }} />}
                route={sub.route}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
