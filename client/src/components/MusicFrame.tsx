// client/src/components/MusicFrame.tsx
import React from 'react';
import ModuleFrame from './ModuleFrame';
import MusicManager from '../utils/MusicManager';
import { useLocale } from '../store/LocaleContext';

const MusicFrame: React.FC = () => {
  const { t } = useLocale();

  return (
    <ModuleFrame
      manager={MusicManager}
      gradient="linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
      emptyText={t('music.empty')}
    />
  );
};

export default MusicFrame;