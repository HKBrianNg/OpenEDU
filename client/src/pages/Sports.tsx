// 体育：预留入口，目前还没有书。
//
// 页面结构和中文 / 英文 / 科学一模一样：从同一个 BookManager 里按
// category: 'sports' 过滤。以后往 books/ 加体育类的书，注册时写上
// category: 'sports'，它就会自动出现在这里，不用改这个文件。
// 没有书的时候走 ModuleFrame 的空状态（book.empty）。

import React from 'react';
import ModuleFrame from '../components/ModuleFrame';
import BookManager from '../utils/BookManager';
import { useLocale } from '../store/LocaleContext';

// 触发各书本的注册（Books.tsx 里也是这句；直接进 /sports 时 Books 还没加载）
import '../books';

const Sports: React.FC = () => {
  const { t } = useLocale();

  return (
    <ModuleFrame
      manager={BookManager}
      filter={item => item.category === 'sports'}
      // 跟首页那张「体育」入口卡同色（黄绿 → 青，避开仪表板的亮绿）
      gradient="linear-gradient(135deg, #96c93d 0%, #00b09b 100%)"
      emptyText={t('book.empty')}
      backLabel={t('nav.backToSports')}
    />
  );
};

export default Sports;
