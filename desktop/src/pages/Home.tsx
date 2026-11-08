// desktop/src/pages/Home.tsx
import { Grid } from 'antd';
import { useEffect, useState } from 'react';
import { getEnabledPrimaryMenus } from '../config/primaryMenu';
import { ModuleCard } from '../components/ModuleCard';
import { createTranslator, getCurrentLocale } from '../utils/locale';
import homeResource from '../locales/home.json';

const { useBreakpoint } = Grid;

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
        {visibleItems.map(item => (
          <ModuleCard
            key={item.featureId}
            title={t(`${item.i18nPrefix}.title`)}
            description={t(`${item.i18nPrefix}.desc`)}
            gradient={item.cardGradient}
            icon={<span style={{ fontSize: 40 }}>{item.icon}</span>}
            route={item.route}
          />
        ))}
      </div>
    </div>
  );
}
