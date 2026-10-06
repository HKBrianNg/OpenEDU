// client/src/components/BookFrame.tsx
import React from 'react';
import ModuleFrame from './ModuleFrame';
import BookManager from '../utils/BookManager';
import { useLocale } from '../store/LocaleContext';

const BookFrame: React.FC = () => {
  const { t } = useLocale();

  return (
    <ModuleFrame
      manager={BookManager}
      gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
      emptyText={t('book.empty')}
    />
  );
};

export default BookFrame;