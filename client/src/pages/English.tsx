// 英文：英语单词、基础 300 句、短句的入口。
//
// 这三本原先摆在 /books 里，跟汉字书写、知识库混在一起 ——
// 语言学习单独一个入口更好找。卡片仍然注册在同一个 BookManager 上，
// 靠 category: 'english' 分开摆。

import React from 'react';
import ModuleFrame from '../components/ModuleFrame';
import BookManager from '../utils/BookManager';
import { useLocale } from '../store/LocaleContext';

// 触发各书本的注册（Books.tsx 里也是这句；直接进 /english 时 Books 还没加载）
import '../books';

const English: React.FC = () => {
  const { t } = useLocale();

  return (
    <ModuleFrame
      manager={BookManager}
      filter={item => item.category === 'english'}
      // 跟首页那张「英文」入口卡同色（深蓝）
      gradient="linear-gradient(135deg, #4b6cb7 0%, #182848 100%)"
      emptyText={t('book.empty')}
      backLabel={t('nav.backToEnglish')}
    />
  );
};

export default English;
