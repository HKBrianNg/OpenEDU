// desktop/src/pages/home/index.tsx

import { Grid } from 'antd';
import { useLocale } from '../../store/LocaleContext';
import { primaryMenu } from '../../layouts/primaryMenu';
import { ModuleCard } from './components/ModuleCard';

const { useBreakpoint } = Grid;

export function Home() {
  const screens = useBreakpoint();
  const { t } = useLocale();

  // antd 的 screens 是「≥断点即 true」（md=true 时 sm 也为 true），
  // 必须从大到小判断，否则宽屏恒命中 sm 分支、卡片被拉得过宽
  const cols = screens.xs
    ? 1
    : screens.md
    ? 4
    : screens.sm
    ? 2
    : 1;

  return (
    <div style={{ padding: '8px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(140px, 1fr))`,
          gap: 12,
          // 一行 4 个后限制容器宽度并居中，卡片不会在大屏上被拉得过宽
          maxWidth: 960,
          margin: '0 auto',
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