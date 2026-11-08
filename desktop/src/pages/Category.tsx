// desktop/src/pages/Category.tsx
import { useState, useEffect } from 'react';
import { Grid, Empty } from 'antd';
import * as Icons from '@ant-design/icons';
import type { FC } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { primaryMenu } from '../config/primaryMenu';
import { ModuleCard } from '../components/ModuleCard';
import { createTranslator, getCurrentLocale } from '../utils/locale';

import shellResource from '../locales/shell.json';
import chineseResource from '../locales/chinese.json';
import englishResource from '../locales/english.json';
import scienceResource from '../locales/science.json';
import sportsResource from '../locales/sports.json';
import musicResource from '../locales/music.json';
import gamesResource from '../locales/games.json';
import booksResource from '../locales/books.json';

const resourceMap: Record<string, any> = {
  chinese: chineseResource,
  english: englishResource,
  science: scienceResource,
  sports: sportsResource,
  music: musicResource,
  games: gamesResource,
  books: booksResource,
};

const { useBreakpoint } = Grid;
type AntIcon = FC<{ style?: React.CSSProperties }>;

export function Category() {
  const { routePath } = useParams<{ routePath: string }>();
  const screens = useBreakpoint();
  const [locale, setLocale] = useState(getCurrentLocale());

  const currentResource = routePath ? resourceMap[routePath] ?? {} : {};
  const t = createTranslator(currentResource);
  const tShell = createTranslator(shellResource);

  const safeT = (key: string): string => {
    const raw = t(key);
    if (raw && typeof raw === 'object') {
      return raw['zh-CN'] ?? key;
    }
    return String(raw ?? key);
  };

  const safeShellT = (key: string): string => {
    const raw = tShell(key);
    if (raw && typeof raw === 'object') {
      return raw['zh-CN'] ?? key;
    }
    return String(raw ?? key);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = getCurrentLocale();
      if (now !== locale) setLocale(now);
    }, 200);
    return () => clearInterval(timer);
  }, [locale]);

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

  return (
    <div style={{ padding: '16px' }}>
      {subItems.length === 0 ? (
        <Empty description={safeShellT('empty.tip')} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(180px, 1fr))`,
            gap: 16
          }}
        >
          {subItems.map(sub => (
            <ModuleCard
              key={sub.featureId}
              title={safeT(`${sub.i18nPrefix}.title`)}
              description={safeT(`${sub.i18nPrefix}.desc`)}
              gradient={sub.cardGradient}
              icon={getIcon(sub.icon)}
              route={sub.route}
            />
          ))}
        </div>
      )}
    </div>
  );
}
