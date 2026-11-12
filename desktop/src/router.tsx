// desktop/src/router.tsx

import { createBrowserRouter } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import { Home } from './pages/Home';
import { Category } from './pages/Category';
import { SportVideo } from './pages/SportVideo';
import { HanziWriting } from './pages/HanziWriting';
import { ChineseNursery } from './pages/music/ChineseNursery';
import { ChinesePop } from './pages/music/ChinesePop';
import { EnglishNursery } from './pages/music/EnglishNursery';
import { EnglishPop } from './pages/music/EnglishPop';
// 👇 games 路由
import CheckerGame from './pages/games/checkers';
import JungleGame from './pages/games/jungle';
import TicTacToe from './pages/games/tictactoe';
import TileMatchingGame from './pages/games/tilematching';
import XiangqiGame from './pages/games/xiangqi';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'sports/video', element: <SportVideo /> },
      { path: 'chinese/writing', element: <HanziWriting /> },
      { path: 'music/cn-nursery', element: <ChineseNursery /> },
      { path: 'music/cn-pop', element: <ChinesePop /> },
      { path: 'music/en-nursery', element: <EnglishNursery /> },
      { path: 'music/en-pop', element: <EnglishPop /> },
      // 👇 games 路由（onExit 传入兜底返回）
      { path: 'games/checkers', element: <CheckerGame /> },
      { path: 'games/jungle', element: <JungleGame /> },
      { path: 'games/tictactoe', element: <TicTacToe /> },
      { path: 'games/tilematching', element: <TileMatchingGame /> },
      { path: 'games/xiangqi', element: <XiangqiGame /> },
      { path: ':routePath', element: <Category /> },
    ]
  }
]);