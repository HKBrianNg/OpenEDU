// client/src/components/GameFrame.tsx
import React from 'react';
import ModuleFrame from './ModuleFrame';
import GameManager from '../utils/GameManager';
import { useLocale } from '../store/LocaleContext';

const GameFrame: React.FC = () => {
  const { t } = useLocale();

  return (
    <ModuleFrame
      manager={GameManager}
      gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      emptyText={t('game.empty')}
      getComponentProps={() => ({ isMobile: window.innerWidth < 768 })}
    />
  );
};

export default GameFrame;