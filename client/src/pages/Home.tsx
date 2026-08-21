// Home.tsx
import React from 'react';
import GameFrame from '../components/GameFrame';
import { shooterGame } from '../games/shooter';

const GAMES = [shooterGame]; // 确保 shooterGame 不是 undefined

const Home: React.FC = () => {
  return <GameFrame games={GAMES} />;
};
export default Home;