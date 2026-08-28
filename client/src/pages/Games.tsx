import React from 'react';
import GameFrame from '../components/GameFrame';
import '../games/shooter';
import '../games/colormatch';  // ← 加这行
import '../games/tictactoe';
import '../games/jungle';

const Games: React.FC = () => {
  return <GameFrame />;
};

export default Games;