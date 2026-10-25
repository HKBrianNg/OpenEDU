import React from 'react';
import ModuleFrame from './ModuleFrame';
import HomeManager from '../utils/HomeManager';
import { useLocale } from '../store/LocaleContext';
import { useAuth } from '../store/AuthContext';

const HomeFrame: React.FC = () => {
  const { t } = useLocale();
  const { user } = useAuth();

  // 仪表板是管理员入口，普通用户不该在首页看到它（顶部菜单同样做了这个判断）
  const visibleManager = {
    getAll: () => HomeManager.getAll().filter(e => !e.adminOnly || user?.role === 'admin'),
    get: (id: string) => HomeManager.get(id),
  };

  return (
    <ModuleFrame
      manager={visibleManager}
      gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
      emptyText={t('home.empty')}
    />
  );
};

export default HomeFrame;
