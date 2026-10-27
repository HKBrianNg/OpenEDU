// 中文：汉字书写入口。
//
// 原先摆在 /books 里，跟英文、科学那些混在一起；单独一个入口更好找。
// 卡片仍然注册在同一个 BookManager 上，靠 category: 'chinese' 分开摆。
// /books 目前因此空着 —— 那是「待归类」的兜底入口，后面加新书会落进去。

import React from 'react';
import ModuleFrame from '../components/ModuleFrame';
import BookManager from '../utils/BookManager';
import { useLocale } from '../store/LocaleContext';

// 触发各书本的注册（Books.tsx 里也是这句；直接进 /chinese 时 Books 还没加载）
import '../books';

const Chinese: React.FC = () => {
  const { t } = useLocale();

  return (
    <ModuleFrame
      manager={BookManager}
      filter={item => item.category === 'chinese'}
      // 跟首页那张「中文」入口卡同色（红，避开音乐的粉）
      gradient="linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)"
      emptyText={t('book.empty')}
      backLabel={t('nav.backToChinese')}
    />
  );
};

export default Chinese;
