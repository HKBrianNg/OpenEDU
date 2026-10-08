import React from 'react';
import ModuleFrame from './ModuleFrame';
import HomeManager from '../utils/HomeManager';
import { useLocale } from '../store/LocaleContext';

const HomeFrame: React.FC = () => {
  const { t } = useLocale();

  return (
    <ModuleFrame
      manager={HomeManager}
      gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
      emptyText={t('home.empty')}
    />
  );
};

export default HomeFrame;