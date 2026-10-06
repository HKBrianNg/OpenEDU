// client/src/components/DashboardFrame.tsx
import React from 'react';
import ModuleFrame from './ModuleFrame';
import DashboardManager from '../utils/DashboardManager';
import { useLocale } from '../store/LocaleContext';

const DashboardFrame: React.FC = () => {
  const { t } = useLocale();

  return (
    <ModuleFrame
      manager={DashboardManager}
      gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
      emptyText={t('dashboard.empty')}
    />
  );
};

export default DashboardFrame;