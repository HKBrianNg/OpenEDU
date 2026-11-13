// desktop/src/pages/Category.tsx
import { Grid, Empty } from 'antd';
import * as Icons from '@ant-design/icons';
import type { FC } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useLocale } from '../../store/LocaleContext';
import { primaryMenu } from '../../config/primaryMenu';
import { ModuleCard } from './components/ModuleCard';

const { useBreakpoint } = Grid;
type AntIcon = FC<{ style?: React.CSSProperties }>;

// 路由路径 → 翻译命名空间映射
const moduleNsMap: Record<string, string> = {
  sports: 'sports',
  chinese: 'chinese',
  english: 'english',
  science: 'science',
  music: 'music',
  games: 'games',
  books: 'books',
  dashboard: 'dashboard',
};

export function Category() {
  const { routePath } = useParams<{ routePath: string }>();
  const screens = useBreakpoint();
  const { t } = useLocale();

  const cols = screens.xs ? 1 : screens.sm ? 2 : screens.md ? 4 : 6;

  const entry = primaryMenu.find(item => item.route === `/${routePath}`);
  const subItems = entry?.children ?? [];

  const getIcon = (iconName: string): React.ReactNode => {
    if (iconName.length <= 4) {
      return <span style={{ fontSize: 40 }}>{iconName}</span>;
    }
    const candidate = (Icons as Record<string, unknown>)[iconName];
    if (typeof candidate === 'function') {
      const Comp = candidate as AntIcon;
      return <Comp style={{ fontSize: 40 }} />;
    }
    return <QuestionCircleOutlined style={{ fontSize: 40 }} />;
  };

  // 构建子项翻译 key 前缀
  // i18nPrefix 如 "sub.english.wordbank" → 去掉 "sub." 拼成 "english.menu.wordbank"
  const buildSubKey = (i18nPrefix: string) => {
    // i18nPrefix 格式: "sub.{module}.{feature}"
    // 目标 key 格式: "{module}.menu.{feature}"
    if (i18nPrefix.startsWith('sub.')) {
      const parts = i18nPrefix.split('.'); // ["sub", "english", "wordbank"]
      if (parts.length >= 3) {
        const mod = parts[1]; // "english"
        const feature = parts.slice(2).join('.'); // "wordbank"
        const ns = moduleNsMap[mod] ?? mod;
        return `${ns}.menu.${feature}`;
      }
    }
    // fallback: 直接拼
    return i18nPrefix;
  };

  return (
    <div style={{ padding: '16px' }}>
      {subItems.length === 0 ? (
        <Empty description={t('shell.empty.tip')} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(180px, 1fr))`,
            gap: 16
          }}
        >
          {subItems.map(sub => {
            const keyPrefix = buildSubKey(sub.i18nPrefix);
            return (
              <ModuleCard
                key={sub.featureId}
                title={t(`${keyPrefix}.title`)}
                description={t(`${keyPrefix}.desc`)}
                gradient={sub.cardGradient}
                icon={getIcon(sub.icon)}
                route={sub.route}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}