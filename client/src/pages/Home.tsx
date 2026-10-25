import React from 'react';
import HomeFrame from '../components/HomeFrame';

// 原来这里 import '../home' 触发 MyCalendar / LearningResults 注册首页卡片。
// 这两个模块已挪进头像菜单（/calendar、/learning-results），
// 不再注册，首页保持留空。再往首页加模块时把那行 import 加回来即可。

const Home : React.FC = () => {
  return <HomeFrame />;
};

export default Home;