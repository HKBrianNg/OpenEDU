import React from 'react';
import GameFrame from '../components/GameFrame';
import '../games/shooter';
import '../games/colormatch';  // ← 加这行

const Home: React.FC = () => {
  return <GameFrame />;
};

export default Home;