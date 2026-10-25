import React from 'react';
import HomeFrame from '../components/HomeFrame';
import '../home';

// import '../home' 触发注册：首页现在是「书籍 / 音乐 / 游戏 / 仪表板」四个功能入口，
// 点了跳对应路由。日程表和学习成果已挪进头像菜单，不在首页占位。

const Home : React.FC = () => {
  return <HomeFrame />;
};

export default Home;