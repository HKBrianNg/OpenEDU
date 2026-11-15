// desktop/src/pages/home/index.tsx

import { Grid } from 'antd';
import { useLocale } from '../../store/LocaleContext';
import { primaryMenu } from '../../layouts/primaryMenu';
import { ModuleCard } from './components/ModuleCard';

const { useBreakpoint } = Grid;

export function Home() {
  const screens = useBreakpoint();
  const { t } = useLocale();

  const cols = screens.xs
    ? 1
    : screens.sm
    ? 2
    : screens.md
    ? 4
    : 6;

  return (
    <div style={{ padding: '8px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(140px, 1fr))`,
          gap: 12
        }}
      >
        {primaryMenu.map(item => (
          <ModuleCard
            key={item.route}
            title={t(`home.${item.i18nPrefix}.title`)}
            description={t(`home.${item.i18nPrefix}.desc`)}
            gradient={item.cardGradient}
            icon={<span style={{ fontSize: 40 }}>{item.icon}</span>}
            route={item.route}
          />
        ))}
      </div>
    </div>
  );
}