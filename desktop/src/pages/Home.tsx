// desktop/src/pages/Home.tsx
import { Grid } from 'antd';
import { useEffect, useState } from 'react';
import { getEnabledPrimaryMenus } from '../config/primaryMenu';
import { ModuleCard } from '../components/ModuleCard';
import type { FC } from 'react';
import { createTranslator, getCurrentLocale } from '../utils/locale';
import homeResource from '../locales/home.json';
import {
  DashboardOutlined,
  TrophyOutlined,
  BookOutlined,
  FontSizeOutlined,
  ExperimentOutlined,
  SoundOutlined,
  AppstoreOutlined,
  ReadOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';

const { useBreakpoint } = Grid;

const iconMap: Record<string, FC<{ style?: React.CSSProperties }>> = {
  DashboardOutlined,
  TrophyOutlined,
  BookOutlined,
  FontSizeOutlined,
  ExperimentOutlined,
  SoundOutlined,
  AppstoreOutlined,
  ReadOutlined,
};

export function Home() {
  const screens = useBreakpoint();
  const [locale, setLocale] = useState(getCurrentLocale());
  const t = createTranslator(homeResource);

  const cols = screens.xs
    ? 1
    : screens.sm
    ? 2
    : screens.md
    ? 4
    : 6;

  const visibleItems = getEnabledPrimaryMenus();

  const getIcon = (iconName: string): FC<{ style?: React.CSSProperties }> => {
    return iconMap[iconName] ?? QuestionCircleOutlined;
  };

  useEffect(() => {
    const check = () => {
      const now = getCurrentLocale();
      if (now !== locale) {
        setLocale(now);
      }
    };
    const timer = setInterval(check, 200);
    return () => clearInterval(timer);
  }, [locale]);

  return (
    <div style={{ padding: '8px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(140px, 1fr))`,
          gap: 12
        }}
      >
        {visibleItems.map(item => {
          const IconCmp = getIcon(item.icon);
          return (
            <ModuleCard
              key={item.featureId}
              title={t(`${item.i18nPrefix}.title`)}
              description={t(`${item.i18nPrefix}.desc`)}
              gradient={item.cardGradient}
              icon={<IconCmp style={{ fontSize: 28, color: '#fff' }} />}
              route={item.route}
            />
          );
        })}
      </div>
    </div>
  );
}
