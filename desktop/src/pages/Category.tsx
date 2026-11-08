// src/pages/Category.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { Grid, Empty, Button } from 'antd';
import { primaryMenu } from '../config/primaryMenu';
import { createTranslator } from '../utils/locale';
import homeResource from '../locales/home.json';

const { useBreakpoint } = Grid;

export function Category() {
  const navigate = useNavigate();
  const { routePath } = useParams<{ routePath: string }>();
  const screens = useBreakpoint();
  const t = createTranslator(homeResource);

  const cols = screens.xs ? 1 : screens.sm ? 2 : 3;

  const item = primaryMenu.find(x => x.route === `/${routePath}`);

  if (!item) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Empty description="找不到该分类" />
        <Button onClick={() => navigate('/')} style={{ marginTop: 16 }}>
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ marginBottom: 16 }}>
        {t(`${item.i18nPrefix}.title`)}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(180px, 1fr))`,
          gap: 16
        }}
      >
        <Empty description="子功能正在开发中" />
      </div>
      <Button onClick={() => navigate('/')} style={{ marginTop: 24 }}>
        返回首页
      </Button>
    </div>
  );
}
