// 科学：知识库、少儿百科的入口。
//
// 这两本原先摆在 /books 里，跟英语单词、汉字书写挤在一起 ——
// 学科类的内容跟语言学习混着不好找，所以单独开一个顶层入口。
// 卡片仍然注册在同一个 BookManager 上，靠 category: 'science' 分开摆。

import React from 'react';
import ModuleFrame from '../components/ModuleFrame';
import BookManager from '../utils/BookManager';
import { useLocale } from '../store/LocaleContext';

// 触发各书本的注册（Books.tsx 里也是这句；直接进 /science 时 Books 还没加载）
import '../books';

const Science: React.FC = () => {
  const { t } = useLocale();

  return (
    <ModuleFrame
      manager={BookManager}
      filter={item => item.category === 'science'}
      // 跟首页那张「科学」入口卡同色（橙黄，避开游戏的青蓝）
      gradient="linear-gradient(135deg, #f7971e 0%, #ffd200 100%)"
      emptyText={t('book.empty')}
      backLabel={t('nav.backToScience')}
    />
  );
};

export default Science;
