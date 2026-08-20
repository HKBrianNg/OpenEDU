import React from 'react';
import { Typography } from 'antd';
import InlineGame from '../components/InlineGame';

const { Title, Paragraph } = Typography;

const Home: React.FC = () => {
  return (
    <div style={{ padding: '40px 20px', maxWidth: 1270, margin: '0 auto' }}>
      <Title level={2}>欢迎来到 OpenEDU</Title>
      <Paragraph>
        在这里你可以学习各种有趣的知识，也可以玩玩小游戏放松一下。
      </Paragraph>
      <div style={{ marginTop: 30 }}>
        <Title level={4}>🎮 打飞机小游戏</Title>
        <InlineGame />
      </div>
      {/* 其他首页内容可放在下方 */}
    </div>
  );
};

export default Home;